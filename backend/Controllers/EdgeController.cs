using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using EegSeizureBackend.Data;
using EegSeizureBackend.DTOs;
using EegSeizureBackend.Models;

namespace EegSeizureBackend.Controllers;

[ApiController]
[Route("api/v1/edge")]
[Authorize]
public class EdgeController : ControllerBase
{
    private readonly AppDbContext _db;

    public EdgeController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("nodes")]
    [Authorize(Roles = "ADMIN,TECHNICIAN")]
    public async Task<ActionResult<IEnumerable<EdgeNodeDto>>> GetNodes()
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        var nodes = await _db.EdgeNodes
            .Where(n => n.HospitalId == hospitalId)
            .Include(n => n.Patient)
            .Include(n => n.ActiveModel)
            .OrderBy(n => n.NodeName)
            .ToListAsync();

        var result = nodes.Select(n => new EdgeNodeDto(
            n.Id,
            n.NodeName,
            n.HardwareMac,
            n.Room,
            n.BatteryPercentage,
            n.Status.ToString(),
            n.FirmwareVersion,
            n.Patient != null ? $"{n.Patient.FirstName} {n.Patient.LastName}" : "Unassigned",
            n.ActiveModel?.VersionName ?? "SeizureNet-v3.2",
            n.LastHeartbeat.ToString("g")
        ));

        return Ok(result);
    }

    [HttpPost("nodes")]
    [Authorize(Roles = "ADMIN,TECHNICIAN")]
    public async Task<IActionResult> CreateNode([FromBody] CreateEdgeNodeDto dto)
    {
        var hospitalIdStr = User.FindFirstValue("hospital_id");
        if (!Guid.TryParse(hospitalIdStr, out var hospitalId)) return Unauthorized();

        var node = new EdgeNode
        {
            HospitalId = hospitalId,
            NodeName = dto.NodeName,
            HardwareMac = dto.HardwareMac,
            Room = dto.Room,
            Status = NodeStatus.ONLINE,
            BatteryPercentage = 100
        };

        _db.EdgeNodes.Add(node);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Edge node hardware registered successfully", id = node.Id });
    }
}
