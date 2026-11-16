using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using EegSeizureBackend.Data;
using EegSeizureBackend.DTOs;
using EegSeizureBackend.Models;

namespace EegSeizureBackend.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Roles = "ADMIN,DOCTOR")]
    public async Task<ActionResult<IEnumerable<NotificationResponseDto>>> GetNotifications()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var hospitalIdStr = User.FindFirstValue("hospital_id");

        if (!Guid.TryParse(userIdStr, out var userId) || !Guid.TryParse(hospitalIdStr, out var hospitalId))
        {
            return Unauthorized();
        }

        IQueryable<AdminNotification> query = _db.AdminNotifications
            .Where(n => n.HospitalId == hospitalId)
            .Include(n => n.RequestedByDoctor).ThenInclude(d => d!.User)
            .Include(n => n.AssignedNurse).ThenInclude(n => n!.User);

        if (role == "DOCTOR")
        {
            var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
            if (doctor == null) return Ok(new List<NotificationResponseDto>());
            query = query.Where(n => n.RequestedByDoctorId == doctor.Id);
        }

        var notifications = await query.OrderByDescending(n => n.SentAt).ToListAsync();

        var result = notifications.Select(n => new NotificationResponseDto(
            n.Id,
            n.Type.ToString(),
            n.PatientId,
            n.PatientName,
            n.RequestedByDoctor?.User?.FullName ?? "Dr. Assigned",
            n.RequestedByDoctorId,
            n.AssignedNurse?.User?.FullName,
            n.RequestedRoom,
            n.SentAt.ToString("g"),
            n.Details ?? string.Empty,
            n.Status.ToString()
        ));

        return Ok(result);
    }

    [HttpPost("admission-request")]
    [Authorize(Roles = "DOCTOR")]
    public async Task<IActionResult> RequestAdmission([FromBody] AdmissionRequestDto dto)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return BadRequest(new { message = "Doctor profile not found" });

        var notif = new AdminNotification
        {
            HospitalId = hospitalId,
            Type = RequestType.admission_request,
            PatientName = dto.PatientName,
            RequestedByDoctorId = doctor.Id,
            AssignedNurseId = dto.AssignedNurseId,
            RequestedRoom = dto.RequestedRoom,
            Details = dto.Details,
            Status = RequestStatus.PENDING,
            SentAt = DateTime.UtcNow
        };

        _db.AdminNotifications.Add(notif);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Admission request submitted to hospital admin", id = notif.Id });
    }

    [HttpPost("discharge-request")]
    [Authorize(Roles = "DOCTOR")]
    public async Task<IActionResult> RequestDischarge([FromBody] DischargeRequestDto dto)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Id == dto.PatientId || p.Mrn == dto.PatientId.ToString());
        if (patient == null) return NotFound(new { message = "Patient not found" });

        var notif = new AdminNotification
        {
            HospitalId = hospitalId,
            Type = RequestType.discharge_request,
            PatientId = patient.Id,
            PatientName = $"{patient.FirstName} {patient.LastName}",
            RequestedByDoctorId = doctor!.Id,
            RequestedRoom = patient.Room,
            Details = dto.Details,
            Status = RequestStatus.PENDING,
            SentAt = DateTime.UtcNow
        };

        _db.AdminNotifications.Add(notif);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Discharge request submitted to hospital admin", id = notif.Id });
    }

    [HttpPost("call-code")]
    [Authorize(Roles = "ADMIN,DOCTOR,NURSE")]
    public async Task<IActionResult> CallCode([FromBody] CallCodeDto dto)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        var admin = await _db.Admins.FirstOrDefaultAsync(a => a.UserId == userId);

        Guid doctorId = doctor?.Id ?? (await _db.Doctors.Select(d => d.Id).FirstOrDefaultAsync());

        var notif = new AdminNotification
        {
            HospitalId = hospitalId,
            Type = RequestType.call_code,
            PatientName = dto.PatientName ?? "Emergency Patient",
            RequestedByDoctorId = doctorId,
            RequestedRoom = dto.Room,
            Details = dto.Details,
            Status = RequestStatus.APPROVED,
            SentAt = DateTime.UtcNow,
            ResolvedAt = DateTime.UtcNow
        };

        var auditLog = new AuditTelemetryLog
        {
            HospitalId = hospitalId,
            UserId = userId,
            EventType = LogEventType.CALL_CODE,
            Severity = LogSeverity.CRITICAL,
            Title = $"EMERGENCY CODE BLUE - Room {dto.Room}",
            Description = dto.Details,
            CreatedAt = DateTime.UtcNow
        };

        _db.AdminNotifications.Add(notif);
        _db.AuditTelemetryLogs.Add(auditLog);
        await _db.SaveChangesAsync();

        return Ok(new { message = "EMERGENCY CODE BLUE DISPATCHED TO ALL STAFF", code_id = notif.Id });
    }

    [HttpPatch("{id}/resolve")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> ResolveNotification(Guid id, [FromBody] ResolveNotificationDto dto)
    {
        var notif = await _db.AdminNotifications.FindAsync(id);
        if (notif == null) return NotFound();

        var adminUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(adminUserIdStr, out var adminUserId))
        {
            var admin = await _db.Admins.FirstOrDefaultAsync(a => a.UserId == adminUserId);
            if (admin != null) notif.AssignedAdminId = admin.Id;
        }

        if (Enum.TryParse<RequestStatus>(dto.Status, true, out var status))
        {
            notif.Status = status;
        }

        notif.ResolvedAt = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(dto.Details)) notif.Details = dto.Details;

        // If discharge request was approved, discharge the patient
        if (notif.Type == RequestType.discharge_request && notif.Status == RequestStatus.APPROVED && notif.PatientId.HasValue)
        {
            var patient = await _db.Patients.FindAsync(notif.PatientId.Value);
            if (patient != null)
            {
                patient.Status = PatientStatus.Discharged;
                patient.DischargedAt = DateTime.UtcNow;
                patient.IsDeleted = true;
                patient.DeletedAt = DateTime.UtcNow;

                var assignedNodes = await _db.EdgeNodes.Where(n => n.PatientId == patient.Id).ToListAsync();
                foreach (var n in assignedNodes)
                {
                    n.PatientId = null;
                }
            }
        }

        // If admission request was approved, admit the patient into the census
        if (notif.Type == RequestType.admission_request && notif.Status == RequestStatus.APPROVED)
        {
            var names = (notif.PatientName ?? "New Patient").Trim().Split(' ');
            var fName = names[0];
            var lName = names.Length > 1 ? string.Join(" ", names.Skip(1)) : "Patient";
            var genMrn = $"PAT-{Random.Shared.Next(1000, 9999)}";

            var newPatient = new Patient
            {
                HospitalId = notif.HospitalId,
                Mrn = genMrn,
                FirstName = fName,
                LastName = lName,
                Dob = new DateOnly(1985, 1, 1),
                Gender = GenderEnum.Male,
                BloodGroup = "O+",
                AssignedFloor = "Floor 4 - ICU",
                Room = !string.IsNullOrEmpty(notif.RequestedRoom) ? notif.RequestedRoom : "404",
                AssignedDoctorId = notif.RequestedByDoctorId,
                AssignedNurseId = notif.AssignedNurseId,
                Status = PatientStatus.Monitoring
            };

            _db.Patients.Add(newPatient);
            await _db.SaveChangesAsync();
            notif.PatientId = newPatient.Id;

            // If an edge node is free in this room or default first available node, assign it
            var freeNode = await _db.EdgeNodes.FirstOrDefaultAsync(n => n.HospitalId == notif.HospitalId && n.PatientId == null && n.Status != NodeStatus.OFFLINE);
            if (freeNode != null)
            {
                freeNode.PatientId = newPatient.Id;
                freeNode.Room = newPatient.Room;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = $"Notification marked as {notif.Status}" });
    }
}
