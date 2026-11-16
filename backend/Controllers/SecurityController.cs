using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EegSeizureBackend.Data;
using EegSeizureBackend.DTOs;
using EegSeizureBackend.Services;

namespace EegSeizureBackend.Controllers;

[ApiController]
[Route("api/v1/security")]
[Authorize(Roles = "ADMIN")] // Strictly ADMIN-ONLY
public class SecurityController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly INeuroShieldService _neuroShield;

    public SecurityController(AppDbContext db, INeuroShieldService neuroShield)
    {
        _db = db;
        _neuroShield = neuroShield;
    }

    [HttpGet("config")]
    public ActionResult<SecurityConfigSummaryDto> GetConfiguration()
    {
        return Ok(_neuroShield.GetSecurityConfiguration());
    }

    [HttpGet("incidents")]
    public async Task<ActionResult<IEnumerable<SecurityIncidentResponseDto>>> GetIncidents([FromQuery] int limit = 100)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        List<SecurityIncidentResponseDto>? incidents = null;
        if (NeuroShieldService.IsDatabaseReachable)
        {
            try
            {
                incidents = await _db.SecurityIncidents
                    .Where(s => s.HospitalId == hospitalId)
                    .OrderByDescending(s => s.CreatedAt)
                    .Take(limit)
                    .Select(s => new SecurityIncidentResponseDto(
                        s.Id,
                        s.IncidentType,
                        s.Severity,
                        s.DeviceId,
                        s.SourceIp,
                        s.SequenceNumberReceived,
                        s.ExpectedMinSequence,
                        s.TimestampReceived.ToString("o"),
                        s.DetailMessage,
                        s.IsResolved,
                        s.ResolvedAt.HasValue ? s.ResolvedAt.Value.ToString("o") : null,
                        s.SourceClassification
                    ))
                    .ToListAsync();
            }
            catch (Exception)
            {
                NeuroShieldService.IsDatabaseReachable = false;
            }
        }

        if (incidents == null && !NeuroShieldService.IsDatabaseReachable)
        {
            // DB offline fallback
            lock (NeuroShieldService.InMemoryLock)
            {
                incidents = NeuroShieldService.InMemoryIncidents
                    .Where(s => s.HospitalId == hospitalId || s.HospitalId == NeuroShieldService.DevHospitalId)
                    .OrderByDescending(s => s.CreatedAt)
                    .Take(limit)
                    .Select(s => new SecurityIncidentResponseDto(
                        s.Id,
                        s.IncidentType,
                        s.Severity,
                        s.DeviceId,
                        s.SourceIp,
                        s.SequenceNumberReceived,
                        s.ExpectedMinSequence,
                        s.TimestampReceived.ToString("o"),
                        s.DetailMessage,
                        s.IsResolved,
                        s.ResolvedAt.HasValue ? s.ResolvedAt.Value.ToString("o") : null,
                        s.SourceClassification
                    ))
                    .ToList();
            }
        }

        return Ok(incidents ?? new List<SecurityIncidentResponseDto>());
    }

    [HttpPatch("incidents/{id}/resolve")]
    public async Task<IActionResult> ResolveIncident(Guid id)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();
        Guid.TryParse(userIdStr, out var userId);

        bool resolvedInDb = false;
        if (NeuroShieldService.IsDatabaseReachable)
        {
            try
            {
                var incident = await _db.SecurityIncidents
                    .FirstOrDefaultAsync(s => s.Id == id && s.HospitalId == hospitalId);

                if (incident != null)
                {
                    incident.IsResolved = true;
                    incident.ResolvedByUserId = userId != Guid.Empty ? userId : null;
                    incident.ResolvedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                    resolvedInDb = true;
                }
            }
            catch (Exception)
            {
                NeuroShieldService.IsDatabaseReachable = false;
            }
        }

        lock (NeuroShieldService.InMemoryLock)
        {
            var inc = NeuroShieldService.InMemoryIncidents.FirstOrDefault(s => s.Id == id);
            if (inc != null)
            {
                inc.IsResolved = true;
                inc.ResolvedByUserId = userId != Guid.Empty ? userId : null;
                inc.ResolvedAt = DateTime.UtcNow;
                return Ok(new { message = "Security incident resolved" });
            }
        }

        if (resolvedInDb)
        {
            return Ok(new { message = "Security incident resolved" });
        }

        return NotFound(new { message = "Security incident not found" });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSecuritySummary()
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        if (NeuroShieldService.IsDatabaseReachable)
        {
            try
            {
                var total = await _db.SecurityIncidents.CountAsync(s => s.HospitalId == hospitalId);
                var active = await _db.SecurityIncidents.CountAsync(s => s.HospitalId == hospitalId && !s.IsResolved);
                var unknownDevices = await _db.SecurityIncidents.CountAsync(s => s.HospitalId == hospitalId && s.IncidentType == "UNKNOWN_DEVICE");
                var replays = await _db.SecurityIncidents.CountAsync(s => s.HospitalId == hospitalId && s.IncidentType == "REPLAY_ATTACK");
                var tampers = await _db.SecurityIncidents.CountAsync(s => s.HospitalId == hospitalId && s.IncidentType == "INVALID_SIGNATURE");
                var floods = await _db.SecurityIncidents.CountAsync(s => s.HospitalId == hospitalId && s.IncidentType == "TRAFFIC_FLOOD");
                var physical = await _db.SecurityIncidents.CountAsync(s => s.HospitalId == hospitalId && s.SourceClassification == "PHYSICAL");
                var simulator = await _db.SecurityIncidents.CountAsync(s => s.HospitalId == hospitalId && s.SourceClassification == "SIMULATOR");
                var untrusted = await _db.SecurityIncidents.CountAsync(s => s.HospitalId == hospitalId && s.SourceClassification == "UNTRUSTED");

                return Ok(new
                {
                    totalIncidents = total,
                    activeIncidents = active,
                    unknownDevicesIntercepted = unknownDevices,
                    replaysBlocked = replays,
                    tamperAttemptsDetected = tampers,
                    floodsMitigated = floods,
                    physicalIncidents = physical,
                    simulatorIncidents = simulator,
                    untrustedIncidents = untrusted
                });
            }
            catch (Exception)
            {
                NeuroShieldService.IsDatabaseReachable = false;
            }
        }

        lock (NeuroShieldService.InMemoryLock)
        {
            var list = NeuroShieldService.InMemoryIncidents
                .Where(s => s.HospitalId == hospitalId || s.HospitalId == NeuroShieldService.DevHospitalId)
                .ToList();

            return Ok(new
            {
                totalIncidents = list.Count,
                activeIncidents = list.Count(s => !s.IsResolved),
                unknownDevicesIntercepted = list.Count(s => s.IncidentType == "UNKNOWN_DEVICE"),
                replaysBlocked = list.Count(s => s.IncidentType == "REPLAY_ATTACK"),
                tamperAttemptsDetected = list.Count(s => s.IncidentType == "INVALID_SIGNATURE"),
                floodsMitigated = list.Count(s => s.IncidentType == "TRAFFIC_FLOOD"),
                physicalIncidents = list.Count(s => s.SourceClassification == "PHYSICAL"),
                simulatorIncidents = list.Count(s => s.SourceClassification == "SIMULATOR"),
                untrustedIncidents = list.Count(s => s.SourceClassification == "UNTRUSTED")
            });
        }
    }
}
