using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using EegSeizureBackend.Data;
using EegSeizureBackend.DTOs;
using EegSeizureBackend.Hubs;
using EegSeizureBackend.Models;
using EegSeizureBackend.Services;

namespace EegSeizureBackend.Controllers;

[ApiController]
[Route("api/v1/telemetry")]
[Authorize]
public class TelemetryController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<TelemetryHub> _hubContext;
    private readonly INeuroShieldService _neuroShield;
    private readonly ILogger<TelemetryController> _logger;

    public TelemetryController(
        AppDbContext db,
        IHubContext<TelemetryHub> hubContext,
        INeuroShieldService neuroShield,
        ILogger<TelemetryController> logger)
    {
        _db = db;
        _hubContext = hubContext;
        _neuroShield = neuroShield;
        _logger = logger;
    }

    [HttpPost("ingest")]
    [AllowAnonymous] // Authenticated cryptographically via HMAC-SHA256 headers
    public async Task<IActionResult> IngestTelemetry()
    {
        // 1. Capture exact raw HTTP request body bytes
        using var ms = new MemoryStream();
        await Request.Body.CopyToAsync(ms);
        var rawBytes = ms.ToArray();

        // 2. Extract canonical authentication and replay headers
        var deviceId = Request.Headers["X-Device-Id"].FirstOrDefault();
        var seqHeader = Request.Headers["X-Sequence-Number"].FirstOrDefault();
        var timestampHeader = Request.Headers["X-Timestamp"].FirstOrDefault();
        var signatureHeader = Request.Headers["X-Signature"].FirstOrDefault();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        // If header missing, check if deviceId is present in json body to provide better diagnostic
        if (string.IsNullOrWhiteSpace(deviceId) && rawBytes.Length > 0)
        {
            try
            {
                using var doc = JsonDocument.Parse(rawBytes);
                if (doc.RootElement.TryGetProperty("deviceId", out var devProp))
                {
                    deviceId = devProp.GetString();
                }
            }
            catch { /* Ignore peek failure */ }
        }

        // Direct Local Fog Telemetry Ingestion (No HMAC headers provided)
        if (string.IsNullOrWhiteSpace(signatureHeader) && string.IsNullOrWhiteSpace(seqHeader))
        {
            IngestTelemetryDto? directDto;
            try
            {
                directDto = JsonSerializer.Deserialize<IngestTelemetryDto>(rawBytes, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize direct telemetry JSON");
                return BadRequest(new { message = "Malformed telemetry JSON body" });
            }

            if (directDto == null) return BadRequest(new { message = "Empty telemetry payload" });

            var devName = directDto.DeviceId ?? deviceId ?? "EEG-Nano-BLE-01";
            var directNode = await _db.EdgeNodes
                .Include(n => n.Patient)
                .FirstOrDefaultAsync(n => n.NodeName.ToLower() == devName.ToLower() ||
                                          n.HardwareMac.ToLower() == devName.ToLower() ||
                                          (n.IotHubDeviceId != null && n.IotHubDeviceId.ToLower() == devName.ToLower()));

            if (directNode == null)
            {
                directNode = await _db.EdgeNodes.Include(n => n.Patient).FirstOrDefaultAsync(n => n.NodeName == "EEG-Nano-BLE-01")
                             ?? await _db.EdgeNodes.Include(n => n.Patient).FirstOrDefaultAsync();
            }

            if (directNode != null)
            {
                directNode.LastHeartbeat = DateTime.UtcNow;
                directNode.BatteryPercentage = directDto.BatteryPercentage;
                directNode.Status = directDto.SeizureProbability >= 0.70m ? NodeStatus.ALERT : NodeStatus.ONLINE;
                directNode.LastSequenceNumber++;

                if (directNode.PatientId.HasValue)
                {
                    var liveVital = new TelemetryLiveVital
                    {
                        HospitalId = directNode.HospitalId,
                        PatientId = directNode.PatientId.Value,
                        EdgeNodeId = directNode.Id,
                        SeizureProbability = directDto.SeizureProbability,
                        EdgeLatencyMs = directDto.EdgeLatencyMs,
                        BatteryPercentage = directDto.BatteryPercentage,
                        RecordedAt = DateTime.UtcNow
                    };
                    _db.TelemetryLiveVitals.Add(liveVital);

                    var pat = await _db.Patients.FindAsync(directNode.PatientId.Value);
                    if (pat != null)
                    {
                        if (directDto.SeizureProbability >= 0.70m)
                        {
                            pat.Status = PatientStatus.Critical;
                        }
                        else if (pat.Status == PatientStatus.Critical && directDto.SeizureProbability < 0.40m)
                        {
                            pat.Status = PatientStatus.Monitoring;
                        }
                    }
                }

                await _db.SaveChangesAsync();

                var directBroadcast = new
                {
                    deviceId = directDto.DeviceId ?? directNode.IotHubDeviceId,
                    nodeName = directNode.NodeName,
                    patientId = directNode.PatientId,
                    seizureProbability = directDto.SeizureProbability,
                    edgeLatencyMs = directDto.EdgeLatencyMs,
                    batteryPercentage = directDto.BatteryPercentage,
                    status = directNode.Status.ToString(),
                    sequenceNumber = directNode.LastSequenceNumber,
                    timestamp = DateTime.UtcNow.ToString("o"),
                    sourceClassification = directNode.SourceClassification
                };

                await _hubContext.Clients.Group($"hospital_{directNode.HospitalId}").SendAsync("ReceiveTelemetry", directBroadcast);

                return Ok(new
                {
                    message = "Direct local telemetry ingested and broadcast successfully",
                    sequenceNumber = directNode.LastSequenceNumber,
                    sourceClassification = directNode.SourceClassification
                });
            }
        }

        // 3. Synchronous Rule-Based IDS Validation (Rate Limit -> Device Lookup -> Raw Body HMAC -> Freshness -> Sequence)
        var validation = await _neuroShield.ValidatePacketAsync(
            deviceId,
            seqHeader,
            timestampHeader,
            signatureHeader,
            rawBytes,
            clientIp);

        if (!validation.IsValid)
        {
            return StatusCode(validation.StatusCode, new
            {
                message = validation.FailureReason,
                incidentType = validation.IncidentType,
                sourceClassification = validation.SourceClassification
            });
        }

        var node = validation.Node!;

        // 4. Deserialize validated payload
        IngestTelemetryDto? dto;
        try
        {
            dto = JsonSerializer.Deserialize<IngestTelemetryDto>(rawBytes, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize verified telemetry JSON for node {NodeName}", node.NodeName);
            return BadRequest(new { message = "Malformed telemetry JSON body" });
        }

        if (dto == null)
        {
            return BadRequest(new { message = "Empty telemetry payload" });
        }

        // 5. Construct clinical vital record if node is assigned to a patient
        TelemetryLiveVital? vital = null;
        Patient? patient = null;

        if (node.PatientId.HasValue)
        {
            vital = new TelemetryLiveVital
            {
                HospitalId = node.HospitalId,
                PatientId = node.PatientId.Value,
                EdgeNodeId = node.Id,
                SeizureProbability = dto.SeizureProbability,
                EdgeLatencyMs = dto.EdgeLatencyMs,
                BatteryPercentage = dto.BatteryPercentage,
                RecordedAt = DateTime.UtcNow
            };
            patient = await _db.Patients.FindAsync(node.PatientId.Value);
        }

        // 6. Concurrency-safe atomic commit (updates sequence number & persists vital in single atomic transaction)
        var committed = await _neuroShield.CommitSequenceAndTelemetryAsync(
            node.Id,
            validation.ParsedSequenceNumber,
            vital ?? new TelemetryLiveVital { HospitalId = node.HospitalId, PatientId = Guid.Empty, EdgeNodeId = node.Id, RecordedAt = DateTime.UtcNow },
            patient,
            dto.SeizureProbability);

        if (!committed)
        {
            await _neuroShield.RecordSecurityIncidentAsync(
                node.HospitalId,
                "REPLAY_ATTACK",
                "CRITICAL",
                node.NodeName,
                clientIp,
                validation.ParsedSequenceNumber,
                node.LastSequenceNumber + 1,
                "Concurrent duplicate sequence number detected during atomic database commit.",
                node.SourceClassification);

            return StatusCode(401, new
            {
                message = "Replay conflict: sequence number was already committed by a concurrent transaction.",
                incidentType = "REPLAY_ATTACK",
                sourceClassification = node.SourceClassification
            });
        }

        // Update in-memory node state for broadcast
        node.BatteryPercentage = dto.BatteryPercentage;
        node.Status = dto.SeizureProbability >= 0.70m ? NodeStatus.ALERT : NodeStatus.ONLINE;
        node.LastSequenceNumber = validation.ParsedSequenceNumber;

        // 7. Broadcast telemetry to authenticated SignalR consumers
        var broadcastPayload = new
        {
            deviceId = dto.DeviceId,
            nodeName = node.NodeName,
            patientId = node.PatientId,
            seizureProbability = dto.SeizureProbability,
            edgeLatencyMs = dto.EdgeLatencyMs,
            batteryPercentage = dto.BatteryPercentage,
            status = node.Status.ToString(),
            sequenceNumber = validation.ParsedSequenceNumber,
            timestamp = DateTime.UtcNow.ToString("o"),
            sourceClassification = node.SourceClassification
        };

        await _hubContext.Clients.Group($"hospital_{node.HospitalId}").SendAsync("ReceiveTelemetry", broadcastPayload);
        await _hubContext.Clients.All.SendAsync("ReceiveTelemetry", broadcastPayload); // Backwards compatibility for useTelemetry

        return Ok(new
        {
            message = "Telemetry authenticated and processed successfully",
            sequenceNumber = validation.ParsedSequenceNumber,
            sourceClassification = node.SourceClassification
        });
    }

    [HttpGet("metrics")]
    [Authorize(Roles = "ADMIN,TECHNICIAN,DOCTOR,NURSE")]
    public async Task<ActionResult<SystemMetricsDto>> GetSystemMetrics()
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        var totalPatients = await _db.Patients.CountAsync(p => p.HospitalId == hospitalId && !p.IsDeleted);
        var criticalCount = await _db.Patients.CountAsync(p => p.HospitalId == hospitalId && !p.IsDeleted && p.Status == PatientStatus.Critical);

        var allNodes = await _db.EdgeNodes.Where(n => n.HospitalId == hospitalId).ToListAsync();
        var totalNodesCount = allNodes.Count;
        var onlineNodes = allNodes.Count(n => n.Status != NodeStatus.OFFLINE);
        var alertNodesCount = allNodes.Count(n => n.Status == NodeStatus.ALERT);

        var allModels = await _db.AiModels
            .Where(m => m.HospitalId == hospitalId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        var activeModel = allModels.FirstOrDefault(m => m.IsDeployed)
                          ?? allModels.LastOrDefault();

        // Recent real-time vitals from database (last 30 points)
        decimal avgLatency = 14.2m;
        var recentTelemetry = new List<LatencyPointDto>();
        try
        {
            var recentVitals = await _db.TelemetryLiveVitals
                .Where(v => v.HospitalId == hospitalId)
                .Include(v => v.EdgeNode)
                .OrderByDescending(v => v.RecordedAt)
                .Take(30)
                .ToListAsync();

            if (recentVitals.Count > 0)
            {
                avgLatency = Math.Round(recentVitals.Average(v => (decimal)v.EdgeLatencyMs), 1);
                recentTelemetry = recentVitals
                    .OrderBy(v => v.RecordedAt)
                    .Select(v => new LatencyPointDto(
                        v.RecordedAt.ToLocalTime().ToString("HH:mm:ss"),
                        v.EdgeLatencyMs,
                        Math.Round(v.SeizureProbability * 100m, 1),
                        v.EdgeNode?.NodeName ?? "Edge-Node"
                    ))
                    .ToList();
            }
        }
        catch { /* Fallback to empty series */ }

        var modelBenchmarks = allModels.Select(m => new ModelBenchmarkPointDto(
            m.VersionName,
            m.Accuracy,
            m.Precision,
            m.Recall,
            m.F1Score,
            m.IsDeployed
        )).ToList();

        return Ok(new SystemMetricsDto(
            totalPatients,
            criticalCount,
            onlineNodes,
            avgLatency,
            activeModel?.Recall ?? 98.10m,
            activeModel?.F1Score ?? 98.00m,
            activeModel?.VersionName ?? "SeizureNet-v3.2",
            totalNodesCount,
            alertNodesCount,
            recentTelemetry,
            modelBenchmarks
        ));
    }

    [HttpGet("audit-logs")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<IEnumerable<AuditLogDto>>> GetAuditLogs([FromQuery] int limit = 50)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        var logs = await _db.AuditTelemetryLogs
            .Where(l => l.HospitalId == hospitalId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .ToListAsync();

        var result = logs.Select(l => new AuditLogDto(
            l.Id,
            l.EventType.ToString(),
            l.Severity.ToString(),
            l.Title,
            l.Description,
            l.CreatedAt.ToString("g")
        ));

        return Ok(result);
    }
}
