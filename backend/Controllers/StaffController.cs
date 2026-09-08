using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using EegSeizureBackend.Data;
using EegSeizureBackend.DTOs;
using EegSeizureBackend.Models;
using EegSeizureBackend.Services;

namespace EegSeizureBackend.Controllers;

[ApiController]
[Route("api/v1/staff")]
[Authorize(Roles = "ADMIN")]
public class StaffController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuthService _auth;

    public StaffController(AppDbContext db, IAuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<StaffResponseDto>>> GetStaff()
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        var users = await _db.Users
            .Where(u => u.HospitalId == hospitalId && !u.IsDeleted)
            .Include(u => u.Admin)
            .Include(u => u.Doctor)
            .Include(u => u.Nurse)
            .Include(u => u.Technician)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var result = users.Select(u =>
        {
            string? dept = u.Role switch
            {
                UserRole.DOCTOR => u.Doctor?.Specialization,
                UserRole.NURSE => u.Nurse?.AssignedFloor,
                UserRole.ADMIN => "Administration",
                UserRole.TECHNICIAN => "EEG & AI Edge Lab",
                _ => null
            };

            string? license = u.Role switch
            {
                UserRole.DOCTOR => u.Doctor?.LicenseNumber,
                UserRole.NURSE => u.Nurse?.LicenseNumber,
                _ => null
            };

            Guid specificId = u.Role switch
            {
                UserRole.DOCTOR => u.Doctor?.Id ?? u.Id,
                UserRole.NURSE => u.Nurse?.Id ?? u.Id,
                UserRole.ADMIN => u.Admin?.Id ?? u.Id,
                UserRole.TECHNICIAN => u.Technician?.Id ?? u.Id,
                _ => u.Id
            };

            return new StaffResponseDto(
                specificId,
                u.Id,
                u.FullName,
                u.Email,
                u.Role.ToString(),
                dept,
                license,
                u.Nurse?.AssignedFloor,
                u.CreatedAt.ToString("MMM dd, yyyy"),
                u.IsActive
            );
        });

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<StaffResponseDto>> CreateStaff([FromBody] CreateStaffDto dto)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
        {
            return BadRequest(new { message = "Invalid role specified" });
        }

        var existing = await _db.Users.FirstOrDefaultAsync(u => u.HospitalId == hospitalId && u.Email.ToLower() == dto.Email.ToLower());
        if (existing != null)
        {
            return BadRequest(new { message = "Email already registered in this hospital" });
        }

        var user = new User
        {
            HospitalId = hospitalId,
            Email = dto.Email,
            PasswordHash = _auth.HashPassword(dto.Password),
            FullName = dto.FullName,
            Role = role,
            IsActive = true
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        switch (role)
        {
            case UserRole.ADMIN:
                _db.Admins.Add(new Admin
                {
                    UserId = user.Id,
                    HospitalId = hospitalId,
                    AdminCode = $"ADM-{new Random().Next(100, 999)}",
                    AccessLevel = "HospitalAdmin"
                });
                break;

            case UserRole.DOCTOR:
                _db.Doctors.Add(new Doctor
                {
                    UserId = user.Id,
                    HospitalId = hospitalId,
                    LicenseNumber = dto.LicenseNumber ?? $"MD-{new Random().Next(10000, 99999)}",
                    Specialization = dto.Department ?? "Neurology",
                    PagerNumber = $"P-{new Random().Next(100, 999)}"
                });
                break;

            case UserRole.NURSE:
                _db.Nurses.Add(new Nurse
                {
                    UserId = user.Id,
                    HospitalId = hospitalId,
                    LicenseNumber = dto.LicenseNumber ?? $"RN-{new Random().Next(10000, 99999)}",
                    AssignedFloor = dto.AssignedFloor ?? "Floor 4 - ICU",
                    ShiftType = "Morning"
                });
                break;

            case UserRole.TECHNICIAN:
                _db.Technicians.Add(new Technician
                {
                    UserId = user.Id,
                    HospitalId = hospitalId
                });
                break;
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Staff member created successfully", userId = user.Id });
    }

    [HttpPut("{userId}/role")]
    public async Task<IActionResult> UpdateStaffRole(Guid userId, [FromBody] UpdateStaffRoleDto dto)
    {
        var user = await _db.Users
            .Include(u => u.Doctor)
            .Include(u => u.Nurse)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.IsDeleted) return NotFound();

        if (Enum.TryParse<UserRole>(dto.Role, true, out var newRole))
        {
            user.Role = newRole;
        }

        if (user.Nurse != null && !string.IsNullOrEmpty(dto.AssignedFloor))
        {
            user.Nurse.AssignedFloor = dto.AssignedFloor;
        }

        if (user.Doctor != null && !string.IsNullOrEmpty(dto.Department))
        {
            user.Doctor.Specialization = dto.Department;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Staff role updated successfully" });
    }

    [HttpDelete("{userId}")]
    public async Task<IActionResult> DeactivateStaff(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted) return NotFound();

        user.IsActive = false;
        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Staff member deactivated successfully" });
    }
}
