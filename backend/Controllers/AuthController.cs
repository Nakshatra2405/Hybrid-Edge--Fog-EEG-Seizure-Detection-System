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
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuthService _auth;

    public AuthController(AppDbContext db, IAuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        User? user = null;
        try
        {
            user = await _db.Users
                .Include(u => u.Admin)
                .Include(u => u.Doctor)
                .Include(u => u.Nurse)
                .Include(u => u.Technician)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && !u.IsDeleted);

            if (user != null)
            {
                NeuroShieldService.IsDatabaseReachable = true;
                if (!_auth.VerifyPassword(request.Password, user.PasswordHash))
                {
                    return Unauthorized(new { message = "Invalid email or password" });
                }

                if (!user.IsActive)
                {
                    return Unauthorized(new { message = "Account has been deactivated. Please contact your administrator." });
                }
            }
        }
        catch (Exception)
        {
            NeuroShieldService.IsDatabaseReachable = false;
        }

        if (user == null && !NeuroShieldService.IsDatabaseReachable)
        {
            // Database is offline - fallback to demo credentials for local development & simulation
            var demoHospitalId = Guid.Parse("11111111-1111-1111-1111-111111111111");
            var emailLower = request.Email.Trim().ToLowerInvariant();

            if (request.Password == "password123")
            {
                if (emailLower == "admin@hospital.com")
                {
                    user = new User
                    {
                        Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                        Email = "admin@hospital.com",
                        FullName = "Administrator John Vance",
                        Role = UserRole.ADMIN,
                        HospitalId = demoHospitalId,
                        IsActive = true
                    };
                }
                else if (emailLower == "doctor@hospital.com")
                {
                    user = new User
                    {
                        Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                        Email = "doctor@hospital.com",
                        FullName = "Dr. Sarah Roberts, MD",
                        Role = UserRole.DOCTOR,
                        HospitalId = demoHospitalId,
                        IsActive = true
                    };
                }
                else if (emailLower == "nurse@hospital.com")
                {
                    user = new User
                    {
                        Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                        Email = "nurse@hospital.com",
                        FullName = "Nurse Emily Davis, RN",
                        Role = UserRole.NURSE,
                        HospitalId = demoHospitalId,
                        IsActive = true
                    };
                }
                else if (emailLower == "technician@hospital.com")
                {
                    user = new User
                    {
                        Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
                        Email = "technician@hospital.com",
                        FullName = "Tech Alex Mercer",
                        Role = UserRole.TECHNICIAN,
                        HospitalId = demoHospitalId,
                        IsActive = true
                    };
                }
            }

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }
        }

        string? department = user.Role switch
        {
            UserRole.DOCTOR => user.Doctor?.Specialization ?? "Neurology",
            UserRole.NURSE => user.Nurse?.AssignedFloor ?? "ICU",
            UserRole.ADMIN => "Administration",
            UserRole.TECHNICIAN => "EEG & AI Systems",
            _ => null
        };

        var token = _auth.GenerateJwtToken(user, department);

        var userDto = new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Role.ToString(),
            user.HospitalId,
            department,
            user.AvatarUrl
        );

        return Ok(new LoginResponse(token, "Bearer", userDto));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        User? user = null;
        if (NeuroShieldService.IsDatabaseReachable)
        {
            try
            {
                user = await _db.Users
                    .Include(u => u.Doctor)
                    .Include(u => u.Nurse)
                    .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
            }
            catch (Exception)
            {
                NeuroShieldService.IsDatabaseReachable = false;
            }
        }

        if (user == null && !NeuroShieldService.IsDatabaseReachable)
        {
            // Database is offline - extract claims from JWT
            var email = User.FindFirstValue(ClaimTypes.Email) ?? "user@hospital.com";
            var roleStr = User.FindFirstValue(ClaimTypes.Role) ?? "ADMIN";
            var hospitalIdStr = User.FindFirstValue("hospital_id");
            Guid.TryParse(hospitalIdStr, out var hId);
            Enum.TryParse<UserRole>(roleStr, out var role);
            var name = User.FindFirstValue(ClaimTypes.Name) ?? "System User";

            user = new User
            {
                Id = userId,
                Email = email,
                FullName = name,
                Role = role,
                HospitalId = hId == Guid.Empty ? Guid.Parse("11111111-1111-1111-1111-111111111111") : hId,
                IsActive = true
            };
        }

        if (user == null)
        {
            return NotFound();
        }

        string? department = user.Role switch
        {
            UserRole.DOCTOR => user.Doctor?.Specialization ?? "Neurology",
            UserRole.NURSE => user.Nurse?.AssignedFloor ?? "ICU",
            UserRole.ADMIN => "Administration",
            UserRole.TECHNICIAN => "EEG & AI Systems",
            _ => null
        };

        return Ok(new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Role.ToString(),
            user.HospitalId,
            department,
            user.AvatarUrl
        ));
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        return Ok(new { message = "Successfully logged out" });
    }
}
