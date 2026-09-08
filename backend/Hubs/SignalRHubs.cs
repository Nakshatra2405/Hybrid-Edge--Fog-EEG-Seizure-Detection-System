using Microsoft.AspNetCore.SignalR;

namespace EegSeizureBackend.Hubs;

public class TelemetryHub : Hub
{
    public async Task JoinHospitalGroup(string hospitalId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"hospital_{hospitalId}");
    }

    public async Task LeaveHospitalGroup(string hospitalId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"hospital_{hospitalId}");
    }
}

public class AlertsHub : Hub
{
    public async Task JoinAlertsGroup(string hospitalId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"alerts_{hospitalId}");
    }
}

public class OtaProgressHub : Hub
{
    public async Task JoinOtaGroup(string nodeId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"ota_{nodeId}");
    }
}
