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
        var user = await _db.Users
            .Include(u => u.Admin)
            .Include(u => u.Doctor)
            .Include(u => u.Nurse)
            .Include(u => u.Technician)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && !u.IsDeleted);

        if (user == null || !_auth.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { message = "Account has been deactivated. Please contact your administrator." });
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

        var user = await _db.Users
            .Include(u => u.Doctor)
            .Include(u => u.Nurse)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

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
