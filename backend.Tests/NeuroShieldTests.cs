using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using EegSeizureBackend.Data;
using EegSeizureBackend.Hubs;
using EegSeizureBackend.Models;
using EegSeizureBackend.Services;

namespace backend.Tests;

public class NeuroShieldTests
{
    private readonly Guid _testHospitalId = Guid.NewGuid();
    private readonly string _deviceSecret = "test_enterprise_secret_key_2026!";

    private (AppDbContext db, NeuroShieldService service, EdgeNode node) CreateTestEnvironment(long initialSequence = 10)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new AppDbContext(options);

        var hospital = new Hospital
        {
            Id = _testHospitalId,
            Name = "Metro General Hospital",
            Code = "MGH-01"
        };
        db.Hospitals.Add(hospital);

        var node = new EdgeNode
        {
            Id = Guid.NewGuid(),
            HospitalId = _testHospitalId,
            NodeName = "Node-01",
            HardwareMac = "AA:BB:CC:DD:EE:01",
            Room = "402",
            LastSequenceNumber = initialSequence,
            LastHeartbeat = DateTime.UtcNow,
            SourceClassification = "SIMULATOR"
        };
        db.EdgeNodes.Add(node);

        var node2 = new EdgeNode
        {
            Id = Guid.NewGuid(),
            HospitalId = _testHospitalId,
            NodeName = "Node-02",
            HardwareMac = "AA:BB:CC:DD:EE:02",
            Room = "403",
            LastSequenceNumber = 0,
            LastHeartbeat = DateTime.UtcNow,
            SourceClassification = "PHYSICAL"
        };
        db.EdgeNodes.Add(node2);
        db.SaveChanges();

        var inMemorySettings = new Dictionary<string, string?>
        {
            ["NeuroShield:RateLimiting:BurstCapacity"] = "6",
            ["NeuroShield:RateLimiting:RefillRatePerSecond"] = "3",
            ["NeuroShield:RateLimiting:IpBurstCapacity"] = "20",
            ["NeuroShield:RateLimiting:IpRefillRatePerSecond"] = "10",
            ["NeuroShield:RateLimiting:SustainedViolationThreshold"] = "3",
            ["NeuroShield:AllowedTimestampSkewSeconds"] = "60",
            ["NeuroShield:DeviceSecrets:Node-01"] = _deviceSecret,
            ["NeuroShield:DeviceSecrets:Node-02"] = _deviceSecret
        };

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var hubContext = new DummyAlertsHubContext();
        var logger = NullLogger<NeuroShieldService>.Instance;

        var service = new NeuroShieldService(db, hubContext, config, logger);
        return (db, service, node);
    }

    [Fact]
    public async Task ValidPacket_WithCorrectHmacAndSequence_PassesValidation()
    {
        var (db, service, node) = CreateTestEnvironment(initialSequence: 100);

        var rawBody = "{\"deviceId\":\"Node-01\",\"seizureProbability\":0.05,\"edgeLatencyMs\":14,\"batteryPercentage\":95,\"status\":\"ONLINE\"}";
        var rawBytes = Encoding.UTF8.GetBytes(rawBody);
        var timestamp = DateTime.UtcNow.ToString("o");
        var sequenceNumber = 101L;

        var signature = service.ComputeHmacSha256("Node-01", sequenceNumber, timestamp, rawBytes, _deviceSecret);

        var result = await service.ValidatePacketAsync(
            "Node-01",
            sequenceNumber.ToString(),
            timestamp,
            signature,
            rawBytes,
            "127.0.0.1");

        Assert.True(result.IsValid);
        Assert.Equal(200, result.StatusCode);
        Assert.NotNull(result.Node);
        Assert.Equal("Node-01", result.Node!.NodeName);
        Assert.Equal(101L, result.ParsedSequenceNumber);
        Assert.Equal("SIMULATOR", result.SourceClassification);
    }

    [Fact]
    public async Task UnknownDevice_IsRejected_WithoutFallbackToNode01()
    {
        var (db, service, _) = CreateTestEnvironment();

        var rawBody = "{\"deviceId\":\"Rogue-Node-99\",\"seizureProbability\":0.99}";
        var rawBytes = Encoding.UTF8.GetBytes(rawBody);
        var timestamp = DateTime.UtcNow.ToString("o");

        var result = await service.ValidatePacketAsync(
            "Rogue-Node-99",
            "100",
            timestamp,
            "abcdef1234567890",
            rawBytes,
            "192.168.1.50");

        Assert.False(result.IsValid);
        Assert.Equal(401, result.StatusCode);
        Assert.Equal("UNKNOWN_DEVICE", result.IncidentType);
        Assert.Equal("UNTRUSTED", result.SourceClassification);
        Assert.Contains("not a registered clinical edge node", result.FailureReason);

        // Verify genuine SecurityIncident was persisted in database
        var incident = await db.SecurityIncidents.FirstOrDefaultAsync(s => s.DeviceId == "Rogue-Node-99");
        Assert.NotNull(incident);
        Assert.Equal("UNKNOWN_DEVICE", incident!.IncidentType);
        Assert.Equal("UNTRUSTED", incident.SourceClassification);
    }

    [Fact]
    public async Task TamperedPayload_FailsHmacVerification()
    {
        var (db, service, node) = CreateTestEnvironment(initialSequence: 50);

        var originalBody = "{\"deviceId\":\"Node-01\",\"seizureProbability\":0.05}";
        var rawBytesOriginal = Encoding.UTF8.GetBytes(originalBody);
        var timestamp = DateTime.UtcNow.ToString("o");
        var sequenceNumber = 51L;

        // Generate signature for benign packet (0.05)
        var signature = service.ComputeHmacSha256("Node-01", sequenceNumber, timestamp, rawBytesOriginal, _deviceSecret);

        // Attacker tampers body to inject false critical seizure (0.95) without updating HMAC
        var tamperedBody = "{\"deviceId\":\"Node-01\",\"seizureProbability\":0.95}";
        var tamperedBytes = Encoding.UTF8.GetBytes(tamperedBody);

        var result = await service.ValidatePacketAsync(
            "Node-01",
            sequenceNumber.ToString(),
            timestamp,
            signature,
            tamperedBytes,
            "10.0.0.99");

        Assert.False(result.IsValid);
        Assert.Equal(401, result.StatusCode);
        Assert.Equal("INVALID_SIGNATURE", result.IncidentType);
        Assert.Equal("SIMULATOR", result.SourceClassification);
        Assert.Contains("HMAC verification failed", result.FailureReason);

        // Verify security incident persisted
        var incident = await db.SecurityIncidents.FirstOrDefaultAsync(s => s.IncidentType == "INVALID_SIGNATURE");
        Assert.NotNull(incident);
        Assert.Equal("SIMULATOR", incident!.SourceClassification);
    }

    [Fact]
    public async Task ReplayAttack_DuplicateOrDecreasingSequence_IsRejected()
    {
        var (db, service, node) = CreateTestEnvironment(initialSequence: 100);

        var rawBody = "{\"deviceId\":\"Node-01\",\"seizureProbability\":0.05}";
        var rawBytes = Encoding.UTF8.GetBytes(rawBody);
        var timestamp = DateTime.UtcNow.ToString("o");

        // Attacker replays previous sequence number 95 (when node is already at 100)
        var replayedSeq = 95L;
        var signature = service.ComputeHmacSha256("Node-01", replayedSeq, timestamp, rawBytes, _deviceSecret);

        var result = await service.ValidatePacketAsync(
            "Node-01",
            replayedSeq.ToString(),
            timestamp,
            signature,
            rawBytes,
            "127.0.0.1");

        Assert.False(result.IsValid);
        Assert.Equal(401, result.StatusCode);
        Assert.Equal("REPLAY_ATTACK", result.IncidentType);
        Assert.Contains("is not greater than last accepted sequence", result.FailureReason);

        // Also test duplicate of current sequence (100)
        var duplicateSeq = 100L;
        var dupSignature = service.ComputeHmacSha256("Node-01", duplicateSeq, timestamp, rawBytes, _deviceSecret);
        var dupResult = await service.ValidatePacketAsync(
            "Node-01",
            duplicateSeq.ToString(),
            timestamp,
            dupSignature,
            rawBytes,
            "127.0.0.1");

        Assert.False(dupResult.IsValid);
        Assert.Equal("REPLAY_ATTACK", dupResult.IncidentType);
    }

    [Fact]
    public async Task ExpiredTimestamp_ClockSkewExceeded_IsRejected()
    {
        var (db, service, node) = CreateTestEnvironment(initialSequence: 10);

        var rawBody = "{\"deviceId\":\"Node-01\",\"seizureProbability\":0.05}";
        var rawBytes = Encoding.UTF8.GetBytes(rawBody);

        // Packet timestamp is 5 minutes in the past
        var expiredTimestamp = DateTime.UtcNow.AddMinutes(-5).ToString("o");
        var sequenceNumber = 11L;

        var signature = service.ComputeHmacSha256("Node-01", sequenceNumber, expiredTimestamp, rawBytes, _deviceSecret);

        var result = await service.ValidatePacketAsync(
            "Node-01",
            sequenceNumber.ToString(),
            expiredTimestamp,
            signature,
            rawBytes,
            "127.0.0.1");

        Assert.False(result.IsValid);
        Assert.Equal(401, result.StatusCode);
        Assert.Equal("REPLAY_ATTACK", result.IncidentType);
        Assert.Contains("outside allowed freshness window", result.FailureReason);
    }

    [Fact]
    public void TokenBucket_AllowsBurst_UpToConfiguredCapacity()
    {
        var (_, service, _) = CreateTestEnvironment();

        var key = $"test-burst-{Guid.NewGuid()}";
        double capacity = 6.0;
        double refillRate = 3.0;

        // First 6 requests should all be allowed under burst capacity
        for (int i = 0; i < (int)capacity; i++)
        {
            var (allowed, violations, remaining) = service.CheckTokenBucketRateLimit(key, capacity, refillRate);
            Assert.True(allowed, $"Burst request {i + 1} should be permitted.");
        }

        // 7th consecutive request in instant burst should be rejected
        var (seventhAllowed, seventhViolations, _) = service.CheckTokenBucketRateLimit(key, capacity, refillRate);
        Assert.False(seventhAllowed, "7th request should exhaust bucket capacity.");
        Assert.Equal(1, seventhViolations);
    }

    [Fact]
    public async Task TokenBucket_ReplenishesTokens_AfterRefillInterval()
    {
        var (_, service, _) = CreateTestEnvironment();

        var key = $"test-refill-{Guid.NewGuid()}";
        double capacity = 2.0;
        double refillRate = 5.0; // 5 tokens per second

        // Exhaust capacity of 2 tokens
        var (firstAllowed, _, _) = service.CheckTokenBucketRateLimit(key, capacity, refillRate);
        var (secondAllowed, _, _) = service.CheckTokenBucketRateLimit(key, capacity, refillRate);
        var (thirdAllowed, _, _) = service.CheckTokenBucketRateLimit(key, capacity, refillRate);

        Assert.True(firstAllowed);
        Assert.True(secondAllowed);
        Assert.False(thirdAllowed, "Capacity should be exhausted.");

        // Wait 400ms -> should replenish at least 2 tokens (5 * 0.4 = 2)
        await Task.Delay(400);

        var (refilledAllowed, violationsAfterRefill, _) = service.CheckTokenBucketRateLimit(key, capacity, refillRate);
        Assert.True(refilledAllowed, "Tokens should have replenished after wait interval.");
        Assert.Equal(0, violationsAfterRefill);
    }

    [Fact]
    public async Task DeviceProvenance_ClassifiesPhysicalAndSimulator_Correctly()
    {
        var (db, service, _) = CreateTestEnvironment(initialSequence: 10);

        // 1. Verify Node-01 is classified as SIMULATOR
        var rawBody1 = "{\"deviceId\":\"Node-01\",\"seizureProbability\":0.10}";
        var rawBytes1 = Encoding.UTF8.GetBytes(rawBody1);
        var timestamp1 = DateTime.UtcNow.ToString("o");
        var sig1 = service.ComputeHmacSha256("Node-01", 11L, timestamp1, rawBytes1, _deviceSecret);

        var result1 = await service.ValidatePacketAsync("Node-01", "11", timestamp1, sig1, rawBytes1, "127.0.0.1");
        Assert.True(result1.IsValid);
        Assert.Equal("SIMULATOR", result1.SourceClassification);

        // 2. Verify Node-02 is classified as PHYSICAL
        var rawBody2 = "{\"deviceId\":\"Node-02\",\"seizureProbability\":0.10}";
        var rawBytes2 = Encoding.UTF8.GetBytes(rawBody2);
        var timestamp2 = DateTime.UtcNow.ToString("o");
        var sig2 = service.ComputeHmacSha256("Node-02", 1L, timestamp2, rawBytes2, _deviceSecret);

        var result2 = await service.ValidatePacketAsync("Node-02", "1", timestamp2, sig2, rawBytes2, "127.0.0.1");
        Assert.True(result2.IsValid);
        Assert.Equal("PHYSICAL", result2.SourceClassification);
    }
}

// Minimal SignalR test double
internal class DummyAlertsHubContext : IHubContext<AlertsHub>
{
    public IHubClients Clients { get; } = new DummyHubClients();
    public IGroupManager Groups { get; } = new DummyGroupManager();
}

internal class DummyHubClients : IHubClients
{
    public IClientProxy All => new DummyClientProxy();
    public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => new DummyClientProxy();
    public IClientProxy Client(string connectionId) => new DummyClientProxy();
    public IClientProxy Clients(IReadOnlyList<string> connectionIds) => new DummyClientProxy();
    public IClientProxy Group(string groupName) => new DummyClientProxy();
    public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => new DummyClientProxy();
    public IClientProxy Groups(IReadOnlyList<string> groupNames) => new DummyClientProxy();
    public IClientProxy User(string userId) => new DummyClientProxy();
    public IClientProxy Users(IReadOnlyList<string> userIds) => new DummyClientProxy();
}

internal class DummyClientProxy : IClientProxy
{
    public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}

internal class DummyGroupManager : IGroupManager
{
    public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default) => Task.CompletedTask;
}
