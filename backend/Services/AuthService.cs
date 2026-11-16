using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using EegSeizureBackend.Models;

namespace EegSeizureBackend.Services;

public interface IAuthService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
    string GenerateJwtToken(User user, string? department = null);
}

public class AuthService : IAuthService
{
    private readonly IConfiguration _config;

    public AuthService(IConfiguration config)
    {
        _config = config;
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }

    public string GenerateJwtToken(User user, string? department = null)
    {
        var secret = _config["JwtSettings:Secret"] ?? "SuperSecretEegSeizureDetectionEnterpriseKey_MustBe32CharsOrLonger2026!";
        var issuer = _config["JwtSettings:Issuer"] ?? "EegSeizureBackend";
        var audience = _config["JwtSettings:Audience"] ?? "EegSeizureDashboard";
        var expiryHours = int.TryParse(_config["JwtSettings:ExpiryHours"], out var hours) ? hours : 24;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("hospital_id", user.HospitalId.ToString())
        };

        if (!string.IsNullOrEmpty(department))
        {
            claims.Add(new Claim("department", department));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
