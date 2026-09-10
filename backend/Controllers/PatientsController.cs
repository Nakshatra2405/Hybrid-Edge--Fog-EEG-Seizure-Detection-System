using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using EegSeizureBackend.Data;
using EegSeizureBackend.DTOs;
using EegSeizureBackend.Models;

namespace EegSeizureBackend.Controllers;

[ApiController]
[Route("api/v1/patients")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PatientsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PatientResponseDto>>> GetPatients(
        [FromQuery] string? status,
        [FromQuery] string? floor,
        [FromQuery] string? search)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var hospitalIdStr = User.FindFirstValue("hospital_id");

        if (role == "TECHNICIAN")
        {
            return Forbid();
        }

        if (!Guid.TryParse(userIdStr, out var userId) || !Guid.TryParse(hospitalIdStr, out var hospitalId))
        {
            return Unauthorized();
        }

        IQueryable<Patient> query = _db.Patients
            .Where(p => p.HospitalId == hospitalId && !p.IsDeleted)
            .Include(p => p.AssignedDoctor).ThenInclude(d => d!.User)
            .Include(p => p.AssignedNurse).ThenInclude(n => n!.User)
            .Include(p => p.EdgeNodes)
            .Include(p => p.TelemetryVitals);

        // Role-based filtering
        if (role == "DOCTOR")
        {
            var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
            if (doctor == null) return Ok(new List<PatientResponseDto>());
            query = query.Where(p => p.AssignedDoctorId == doctor.Id);
        }
        else if (role == "NURSE")
        {
            var nurse = await _db.Nurses.FirstOrDefaultAsync(n => n.UserId == userId);
            if (nurse == null) return Ok(new List<PatientResponseDto>());
            query = query.Where(p => p.AssignedNurseId == nurse.Id);
        }

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<PatientStatus>(status, true, out var patientStatus))
        {
            query = query.Where(p => p.Status == patientStatus);
        }

        if (!string.IsNullOrEmpty(floor))
        {
            query = query.Where(p => p.AssignedFloor.ToLower().Contains(floor.ToLower()));
        }

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            query = query.Where(p => p.FirstName.ToLower().Contains(s) || 
                                     p.LastName.ToLower().Contains(s) || 
                                     p.Mrn.ToLower().Contains(s));
        }

        var patients = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();

        var result = patients.Select(p =>
        {
            var latestVital = p.TelemetryVitals.OrderByDescending(v => v.RecordedAt).FirstOrDefault();
            var edgeNode = p.EdgeNodes.FirstOrDefault();

            int age = DateTime.UtcNow.Year - p.Dob.Year;
            if (p.Dob.ToDateTime(TimeOnly.MinValue) > DateTime.UtcNow.AddYears(-age)) age--;

            return new PatientResponseDto(
                p.Id,
                p.Mrn,
                $"{p.FirstName} {p.LastName}",
                age,
                p.Dob.ToString("yyyy-MM-dd"),
                p.Gender.ToString(),
                p.BloodGroup,
                p.Status.ToString(),
                p.Room,
                p.AssignedFloor,
                p.AssignedDoctor?.User?.FullName ?? "Unassigned",
                p.AssignedDoctorId,
                p.AssignedNurse?.User?.FullName ?? "Unassigned",
                p.AssignedNurseId,
                p.CreatedAt.ToString("g"),
                edgeNode != null ? $"{edgeNode.BatteryPercentage}%" : "100%",
                edgeNode?.NodeName ?? "Node-01",
                latestVital?.SeizureProbability ?? 0.0500m,
                latestVital?.EdgeLatencyMs ?? 14
            );
        });

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PatientResponseDto>> GetPatientById(Guid id)
    {
        var patient = await _db.Patients
            .Include(p => p.AssignedDoctor).ThenInclude(d => d!.User)
            .Include(p => p.AssignedNurse).ThenInclude(n => n!.User)
            .Include(p => p.EdgeNodes)
            .Include(p => p.TelemetryVitals)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (patient == null) return NotFound(new { message = "Patient not found" });

        var latestVital = patient.TelemetryVitals.OrderByDescending(v => v.RecordedAt).FirstOrDefault();
        var edgeNode = patient.EdgeNodes.FirstOrDefault();

        int age = DateTime.UtcNow.Year - patient.Dob.Year;

        return Ok(new PatientResponseDto(
            patient.Id,
            patient.Mrn,
            $"{patient.FirstName} {patient.LastName}",
            age,
            patient.Dob.ToString("yyyy-MM-dd"),
            patient.Gender.ToString(),
            patient.BloodGroup,
            patient.Status.ToString(),
            patient.Room,
            patient.AssignedFloor,
            patient.AssignedDoctor?.User?.FullName ?? "Unassigned",
            patient.AssignedDoctorId,
            patient.AssignedNurse?.User?.FullName ?? "Unassigned",
            patient.AssignedNurseId,
            patient.CreatedAt.ToString("g"),
            edgeNode != null ? $"{edgeNode.BatteryPercentage}%" : "100%",
            edgeNode?.NodeName ?? "Node-01",
            latestVital?.SeizureProbability ?? 0.0500m,
            latestVital?.EdgeLatencyMs ?? 14
        ));
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<PatientResponseDto>> CreatePatient([FromBody] PatientCreateDto dto)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        if (!DateOnly.TryParse(dto.Dob, out var dob))
        {
            return BadRequest(new { message = "Invalid Date of Birth format (expected yyyy-MM-dd)" });
        }

        Enum.TryParse<GenderEnum>(dto.Gender, true, out var gender);

        var patient = new Patient
        {
            HospitalId = hospitalId,
            Mrn = dto.Mrn,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Dob = dob,
            Gender = gender,
            BloodGroup = dto.BloodGroup,
            AssignedFloor = dto.AssignedFloor,
            Room = dto.Room,
            AssignedDoctorId = dto.AssignedDoctorId,
            AssignedNurseId = dto.AssignedNurseId,
            Status = PatientStatus.Monitoring
        };

        _db.Patients.Add(patient);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPatientById), new { id = patient.Id }, new { id = patient.Id, message = "Patient admitted successfully" });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN,DOCTOR")]
    public async Task<IActionResult> UpdatePatient(Guid id, [FromBody] PatientUpdateDto dto)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient == null || patient.IsDeleted) return NotFound();

        if (!string.IsNullOrEmpty(dto.AssignedFloor)) patient.AssignedFloor = dto.AssignedFloor;
        if (!string.IsNullOrEmpty(dto.Room)) patient.Room = dto.Room;
        if (dto.AssignedDoctorId.HasValue) patient.AssignedDoctorId = dto.AssignedDoctorId.Value;
        if (dto.AssignedNurseId.HasValue) patient.AssignedNurseId = dto.AssignedNurseId.Value;
        if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<PatientStatus>(dto.Status, true, out var status))
        {
            patient.Status = status;
        }

        patient.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Patient updated successfully" });
    }

    [HttpDelete("{id}/discharge")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DischargePatient(Guid id, [FromBody] PatientDischargeDto? dto)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient == null || patient.IsDeleted) return NotFound();

        patient.Status = PatientStatus.Discharged;
        patient.DischargedAt = DateTime.UtcNow;
        patient.IsDeleted = true;
        patient.DeletedAt = DateTime.UtcNow;
        patient.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Patient discharged successfully" });
    }
}
