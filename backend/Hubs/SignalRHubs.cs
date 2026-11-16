using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace EegSeizureBackend.Hubs;

[Authorize]
public class TelemetryHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var hospitalId = Context.User?.FindFirstValue("hospital_id");
        if (!string.IsNullOrEmpty(hospitalId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"hospital_{hospitalId}");
        }
        await base.OnConnectedAsync();
    }

    public async Task JoinHospitalGroup(string hospitalId)
    {
        // Enforce tenant isolation: client can only join their authenticated hospital group
        var authHospitalId = Context.User?.FindFirstValue("hospital_id");
        if (!string.IsNullOrEmpty(authHospitalId) && string.Equals(authHospitalId, hospitalId, StringComparison.OrdinalIgnoreCase))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"hospital_{hospitalId}");
        }
    }

    public async Task LeaveHospitalGroup(string hospitalId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"hospital_{hospitalId}");
    }
}

[Authorize(Roles = "ADMIN")]
public class AlertsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var hospitalId = Context.User?.FindFirstValue("hospital_id");
        if (!string.IsNullOrEmpty(hospitalId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"alerts_{hospitalId}");
        }
        await base.OnConnectedAsync();
    }

    public async Task JoinAlertsGroup(string? hospitalId = null)
    {
        // Derived exclusively from validated JWT claim
        var authHospitalId = Context.User?.FindFirstValue("hospital_id");
        if (!string.IsNullOrEmpty(authHospitalId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"alerts_{authHospitalId}");
        }
    }
}

[Authorize]
public class OtaProgressHub : Hub
{
    public async Task JoinOtaGroup(string nodeId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"ota_{nodeId}");
    }
}
