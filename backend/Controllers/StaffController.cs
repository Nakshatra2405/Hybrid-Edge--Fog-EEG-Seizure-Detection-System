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

        if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "Full Name, Clinical Email, and Password are compulsory." });
        }

        if (role == UserRole.DOCTOR && string.IsNullOrWhiteSpace(dto.LicenseNumber))
        {
            return BadRequest(new { message = "Medical License Number is compulsory for Doctor provisioning." });
        }

        if (role == UserRole.NURSE && string.IsNullOrWhiteSpace(dto.LicenseNumber))
        {
            return BadRequest(new { message = "Nursing License Number is compulsory for Nurse provisioning." });
        }

        if ((role == UserRole.ADMIN || role == UserRole.TECHNICIAN) && string.IsNullOrWhiteSpace(dto.Department))
        {
            return BadRequest(new { message = "Department / Lab designation is compulsory." });
        }

        var existing = await _db.Users
            .Include(u => u.Admin)
            .Include(u => u.Doctor)
            .Include(u => u.Nurse)
            .Include(u => u.Technician)
            .FirstOrDefaultAsync(u => u.HospitalId == hospitalId && u.Email.ToLower() == dto.Email.ToLower());

        if (existing != null)
        {
            if (!existing.IsDeleted)
            {
                return BadRequest(new { message = "An active staff member is already registered with this email." });
            }

            // If account was previously deleted, reactivate & re-provision with updated credentials & role
            existing.FullName = dto.FullName;
            existing.PasswordHash = _auth.HashPassword(dto.Password);
            existing.Role = role;
            existing.IsActive = true;
            existing.IsDeleted = false;
            existing.DeletedAt = null;
            existing.UpdatedAt = DateTime.UtcNow;

            // Remove previous role entity if role changed
            if (existing.Admin != null && role != UserRole.ADMIN) _db.Admins.Remove(existing.Admin);
            if (existing.Doctor != null && role != UserRole.DOCTOR) _db.Doctors.Remove(existing.Doctor);
            if (existing.Nurse != null && role != UserRole.NURSE) _db.Nurses.Remove(existing.Nurse);
            if (existing.Technician != null && role != UserRole.TECHNICIAN) _db.Technicians.Remove(existing.Technician);

            // Provision or update role-specific entity
            switch (role)
            {
                case UserRole.ADMIN:
                    if (existing.Admin == null)
                    {
                        _db.Admins.Add(new Admin
                        {
                            UserId = existing.Id,
                            HospitalId = hospitalId,
                            AdminCode = $"ADM-{new Random().Next(100, 999)}",
                            AccessLevel = "HospitalAdmin"
                        });
                    }
                    break;

                case UserRole.DOCTOR:
                    if (existing.Doctor == null)
                    {
                        _db.Doctors.Add(new Doctor
                        {
                            UserId = existing.Id,
                            HospitalId = hospitalId,
                            LicenseNumber = dto.LicenseNumber ?? $"MD-{new Random().Next(10000, 99999)}",
                            Specialization = dto.Department ?? "Neurology",
                            PagerNumber = $"P-{new Random().Next(100, 999)}"
                        });
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(dto.LicenseNumber)) existing.Doctor.LicenseNumber = dto.LicenseNumber;
                        if (!string.IsNullOrEmpty(dto.Department)) existing.Doctor.Specialization = dto.Department;
                    }
                    break;

                case UserRole.NURSE:
                    if (existing.Nurse == null)
                    {
                        _db.Nurses.Add(new Nurse
                        {
                            UserId = existing.Id,
                            HospitalId = hospitalId,
                            LicenseNumber = dto.LicenseNumber ?? $"RN-{new Random().Next(10000, 99999)}",
                            AssignedFloor = dto.AssignedFloor ?? "Floor 4 - ICU",
                            ShiftType = "Morning"
                        });
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(dto.LicenseNumber)) existing.Nurse.LicenseNumber = dto.LicenseNumber;
                        if (!string.IsNullOrEmpty(dto.AssignedFloor)) existing.Nurse.AssignedFloor = dto.AssignedFloor;
                    }
                    break;

                case UserRole.TECHNICIAN:
                    if (existing.Technician == null)
                    {
                        _db.Technicians.Add(new Technician
                        {
                            UserId = existing.Id,
                            HospitalId = hospitalId
                        });
                    }
                    break;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Staff member re-provisioned and activated successfully", userId = existing.Id });
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

    [HttpPut("{userId}")]
    public async Task<IActionResult> UpdateStaff(Guid userId, [FromBody] UpdateStaffDto dto)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        var user = await _db.Users
            .Include(u => u.Admin)
            .Include(u => u.Doctor)
            .Include(u => u.Nurse)
            .Include(u => u.Technician)
            .FirstOrDefaultAsync(u => u.Id == userId && u.HospitalId == hospitalId);

        if (user == null || user.IsDeleted) return NotFound(new { message = "Staff member not found" });

        if (!string.IsNullOrWhiteSpace(dto.FullName))
        {
            user.FullName = dto.FullName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            user.PasswordHash = _auth.HashPassword(dto.Password);
        }

        if (!string.IsNullOrEmpty(dto.Role) && Enum.TryParse<UserRole>(dto.Role, true, out var newRole))
        {
            var oldRole = user.Role;
            user.Role = newRole;

            // Clean up previous role entity if role changed
            if (oldRole != newRole)
            {
                if (user.Admin != null && newRole != UserRole.ADMIN) _db.Admins.Remove(user.Admin);
                if (user.Doctor != null && newRole != UserRole.DOCTOR) _db.Doctors.Remove(user.Doctor);
                if (user.Nurse != null && newRole != UserRole.NURSE) _db.Nurses.Remove(user.Nurse);
                if (user.Technician != null && newRole != UserRole.TECHNICIAN) _db.Technicians.Remove(user.Technician);
            }

            switch (newRole)
            {
                case UserRole.ADMIN:
                    if (user.Admin == null)
                    {
                        _db.Admins.Add(new Admin
                        {
                            UserId = user.Id,
                            HospitalId = hospitalId,
                            AdminCode = $"ADM-{new Random().Next(100, 999)}",
                            AccessLevel = "HospitalAdmin"
                        });
                    }
                    break;

                case UserRole.DOCTOR:
                    if (user.Doctor == null)
                    {
                        _db.Doctors.Add(new Doctor
                        {
                            UserId = user.Id,
                            HospitalId = hospitalId,
                            LicenseNumber = dto.LicenseNumber ?? $"MD-{new Random().Next(10000, 99999)}",
                            Specialization = dto.Department ?? "Neurology",
                            PagerNumber = $"P-{new Random().Next(100, 999)}"
                        });
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(dto.LicenseNumber)) user.Doctor.LicenseNumber = dto.LicenseNumber;
                        if (!string.IsNullOrEmpty(dto.Department)) user.Doctor.Specialization = dto.Department;
                    }
                    break;

                case UserRole.NURSE:
                    if (user.Nurse == null)
                    {
                        _db.Nurses.Add(new Nurse
                        {
                            UserId = user.Id,
                            HospitalId = hospitalId,
                            LicenseNumber = dto.LicenseNumber ?? $"RN-{new Random().Next(10000, 99999)}",
                            AssignedFloor = dto.AssignedFloor ?? "Floor 4 - ICU",
                            ShiftType = "Morning"
                        });
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(dto.LicenseNumber)) user.Nurse.LicenseNumber = dto.LicenseNumber;
                        if (!string.IsNullOrEmpty(dto.AssignedFloor)) user.Nurse.AssignedFloor = dto.AssignedFloor;
                    }
                    break;

                case UserRole.TECHNICIAN:
                    if (user.Technician == null)
                    {
                        _db.Technicians.Add(new Technician
                        {
                            UserId = user.Id,
                            HospitalId = hospitalId
                        });
                    }
                    break;
            }
        }
        else
        {
            if (user.Doctor != null)
            {
                if (!string.IsNullOrEmpty(dto.LicenseNumber)) user.Doctor.LicenseNumber = dto.LicenseNumber;
                if (!string.IsNullOrEmpty(dto.Department)) user.Doctor.Specialization = dto.Department;
            }
            if (user.Nurse != null)
            {
                if (!string.IsNullOrEmpty(dto.LicenseNumber)) user.Nurse.LicenseNumber = dto.LicenseNumber;
                if (!string.IsNullOrEmpty(dto.AssignedFloor)) user.Nurse.AssignedFloor = dto.AssignedFloor;
            }
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Staff member updated successfully" });
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

