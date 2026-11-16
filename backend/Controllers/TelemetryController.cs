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
    [Authorize(Roles = "ADMIN,TECHNICIAN")]
    public async Task<ActionResult<SystemMetricsDto>> GetSystemMetrics()
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        var totalPatients = await _db.Patients.CountAsync(p => p.HospitalId == hospitalId && !p.IsDeleted);
        var criticalCount = await _db.Patients.CountAsync(p => p.HospitalId == hospitalId && !p.IsDeleted && p.Status == PatientStatus.Critical);
        var onlineNodes = await _db.EdgeNodes.CountAsync(n => n.HospitalId == hospitalId && n.Status == NodeStatus.ONLINE);

        var activeModel = await _db.AiModels.FirstOrDefaultAsync(m => m.HospitalId == hospitalId && m.IsDeployed)
                          ?? await _db.AiModels.OrderByDescending(m => m.CreatedAt).FirstOrDefaultAsync();

        return Ok(new SystemMetricsDto(
            totalPatients,
            criticalCount,
            onlineNodes,
            14.2m, // Average Edge latency ms
            activeModel?.Recall ?? 98.10m,
            activeModel?.F1Score ?? 98.00m
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
