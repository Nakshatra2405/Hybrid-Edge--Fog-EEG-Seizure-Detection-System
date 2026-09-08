using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using EegSeizureBackend.Data;
using EegSeizureBackend.DTOs;
using EegSeizureBackend.Models;

namespace EegSeizureBackend.Controllers;

[ApiController]
[Route("api/v1/clinical-records")]
[Authorize]
public class ClinicalRecordsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ClinicalRecordsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Roles = "DOCTOR,TECHNICIAN")]
    public async Task<ActionResult<IEnumerable<ClinicalSessionDto>>> GetSessions()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var hospitalIdStr = User.FindFirstValue("hospital_id");

        if (!Guid.TryParse(userIdStr, out var userId) || !Guid.TryParse(hospitalIdStr, out var hospitalId))
        {
            return Unauthorized();
        }

        IQueryable<ClinicalEegSession> query = _db.ClinicalEegSessions
            .Where(s => s.HospitalId == hospitalId)
            .Include(s => s.Patient)
            .Include(s => s.Doctor).ThenInclude(d => d!.User)
            .Include(s => s.EdgeNode);

        if (role == "DOCTOR")
        {
            var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
            if (doctor == null) return Ok(new List<ClinicalSessionDto>());
            query = query.Where(s => s.DoctorId == doctor.Id);
        }
        else if (role == "TECHNICIAN")
        {
            // Technicians only see doctor-approved sessions
            query = query.Where(s => s.DoctorApprovedForTraining);
        }

        var sessions = await query.OrderByDescending(s => s.StartTime).ToListAsync();

        var result = sessions.Select((s, index) =>
        {
            // Anonymize patient PII for technician
            string patientDisplayName = role == "TECHNICIAN" 
                ? $"SMP-{(index + 1) * 1000 + s.DataPointsCount % 900}" 
                : $"{s.Patient?.FirstName} {s.Patient?.LastName}";

            return new ClinicalSessionDto(
                s.Id,
                s.PatientId,
                patientDisplayName,
                s.Doctor?.User?.FullName ?? "Dr. Assigned",
                s.StartTime.ToString("g"),
                s.EndTime.ToString("g"),
                $"{s.DurationSeconds / 60}m {s.DurationSeconds % 60}s",
                s.EdgeNode?.NodeName ?? "Node-01",
                s.MaxSeizureProbability,
                s.Classification.ToString().Replace('_', ' '),
                s.DataPointsCount,
                s.DoctorApprovedForTraining,
                s.ApprovedAt?.ToString("g"),
                s.TechnicianStatus.ToString().Replace('_', ' ')
            );
        });

        return Ok(result);
    }

    [HttpPatch("{sessionId}/approve")]
    [Authorize(Roles = "DOCTOR")]
    public async Task<IActionResult> ApproveSessionForTraining(Guid sessionId)
    {
        var session = await _db.ClinicalEegSessions.FindAsync(sessionId);
        if (session == null) return NotFound(new { message = "Session record not found" });

        session.DoctorApprovedForTraining = true;
        session.ApprovedAt = DateTime.UtcNow;
        session.TechnicianStatus = TechApprovalStatus.Approved_for_Training;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            session_id = session.Id,
            doctor_approved_for_training = true,
            approved_at = session.ApprovedAt,
            technician_status = "Approved for Training"
        });
    }

    [HttpPost("send-for-training")]
    [Authorize(Roles = "DOCTOR,TECHNICIAN")]
    public async Task<ActionResult<SendTrainingResponseDto>> SendDataForTraining()
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        var approvedSessions = await _db.ClinicalEegSessions
            .Where(s => s.HospitalId == hospitalId && s.DoctorApprovedForTraining)
            .ToListAsync();

        foreach (var session in approvedSessions)
        {
            session.TechnicianStatus = TechApprovalStatus.Added_to_Training;
        }

        await _db.SaveChangesAsync();

        return Ok(new SendTrainingResponseDto(
            "dispatched",
            approvedSessions.Count,
            "eeg-training-data"
        ));
    }
}
