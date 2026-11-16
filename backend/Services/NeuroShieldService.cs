using System.Collections.Concurrent;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using EegSeizureBackend.Data;
using EegSeizureBackend.DTOs;
using EegSeizureBackend.Hubs;
using EegSeizureBackend.Models;

namespace EegSeizureBackend.Services;

public class TokenBucket
{
    private readonly double _capacity;
    private readonly double _refillRate;
    private double _tokens;
    private DateTime _lastRefillUtc;
    private readonly object _lock = new();
    private int _consecutiveViolations;

    public TokenBucket(double capacity, double refillRate)
    {
        _capacity = capacity;
        _refillRate = refillRate;
        _tokens = capacity;
        _lastRefillUtc = DateTime.UtcNow;
        _consecutiveViolations = 0;
    }

    public (bool Allowed, int ConsecutiveViolations, double RemainingTokens) TryConsume(double cost = 1.0)
    {
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            var elapsedSeconds = (now - _lastRefillUtc).TotalSeconds;
            if (elapsedSeconds > 0)
            {
                _tokens = Math.Min(_capacity, _tokens + elapsedSeconds * _refillRate);
                _lastRefillUtc = now;
            }

            if (_tokens >= cost)
            {
                _tokens -= cost;
                _consecutiveViolations = 0;
                return (true, 0, _tokens);
            }
            else
            {
                _consecutiveViolations++;
                return (false, _consecutiveViolations, _tokens);
            }
        }
    }
}

public class NeuroShieldService : INeuroShieldService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<AlertsHub> _alertsHub;
    private readonly IConfiguration _config;
    private readonly ILogger<NeuroShieldService> _logger;

    // In-memory token-bucket rate limiter: key -> TokenBucket
    private static readonly ConcurrentDictionary<string, TokenBucket> _tokenBuckets = new();

    // In-memory fallback stores when DB is offline
    public static bool IsDatabaseReachable = true;
    public static readonly List<SecurityIncident> InMemoryIncidents = new();
    public static readonly object InMemoryLock = new();
    private static readonly ConcurrentDictionary<Guid, long> _inMemoryNodeSequences = new();

    public static readonly Guid DevHospitalId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly EdgeNode DevNode01 = new()
    {
        Id = Guid.Parse("11111111-0000-0000-0000-000000000001"),
        HospitalId = DevHospitalId,
        NodeName = "Node-01",
        HardwareMac = "AA:BB:CC:DD:EE:01",
        IotHubDeviceId = "edge-node-01",
        Status = NodeStatus.ONLINE,
        LastHeartbeat = DateTime.UtcNow,
        LastSequenceNumber = 0,
        SourceClassification = "SIMULATOR"
    };
    private static readonly EdgeNode DevNode02 = new()
    {
        Id = Guid.Parse("11111111-0000-0000-0000-000000000002"),
        HospitalId = DevHospitalId,
        NodeName = "Node-02",
        HardwareMac = "AA:BB:CC:DD:EE:02",
        IotHubDeviceId = "edge-node-02",
        Status = NodeStatus.ONLINE,
        LastHeartbeat = DateTime.UtcNow,
        LastSequenceNumber = 0,
        SourceClassification = "PHYSICAL"
    };

    private readonly double _defaultBurstCapacity;
    private readonly double _defaultRefillRate;
    private readonly double _ipBurstCapacity;
    private readonly double _ipRefillRate;
    private readonly int _sustainedViolationThreshold;
    private readonly int _allowedTimestampSkewSeconds;

    public NeuroShieldService(
        AppDbContext db,
        IHubContext<AlertsHub> alertsHub,
        IConfiguration config,
        ILogger<NeuroShieldService> logger)
    {
        _db = db;
        _alertsHub = alertsHub;
        _config = config;
        _logger = logger;

        _defaultBurstCapacity = double.TryParse(_config["NeuroShield:RateLimiting:BurstCapacity"], out var bc) ? bc : 6.0;
        _defaultRefillRate = double.TryParse(_config["NeuroShield:RateLimiting:RefillRatePerSecond"], out var rr) ? rr : 3.0;
        _ipBurstCapacity = double.TryParse(_config["NeuroShield:RateLimiting:IpBurstCapacity"], out var ipc) ? ipc : 20.0;
        _ipRefillRate = double.TryParse(_config["NeuroShield:RateLimiting:IpRefillRatePerSecond"], out var ipr) ? ipr : 10.0;
        _sustainedViolationThreshold = int.TryParse(_config["NeuroShield:RateLimiting:SustainedViolationThreshold"], out var svt) ? svt : 3;
        _allowedTimestampSkewSeconds = int.TryParse(_config["NeuroShield:AllowedTimestampSkewSeconds"], out var skew) ? skew : 60;
    }

    public async Task<TelemetryValidationResult> ValidatePacketAsync(
        string? deviceId,
        string? sequenceHeader,
        string? timestampHeader,
        string? signatureHeader,
        byte[] rawBodyBytes,
        string? clientIp)
    {
        // -------------------------------------------------------------
        // Rule 1: Early IP-Level Token-Bucket Rate Limiting (DoS Protection)
        // -------------------------------------------------------------
        var ipKey = $"ip:{clientIp ?? "unknown"}";
        var (ipAllowed, ipViolations, _) = CheckTokenBucketRateLimit(ipKey, _ipBurstCapacity, _ipRefillRate);
        if (!ipAllowed)
        {
            if (ipViolations >= _sustainedViolationThreshold)
            {
                await RecordIncidentFallbackAsync("TRAFFIC_FLOOD", "WARNING", deviceId ?? "unknown", clientIp,
                    null, null, $"Sustained rate limit exceeded for client IP {clientIp} ({ipViolations} consecutive bursts). Potential DoS flood.", "UNTRUSTED");
            }

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 429,
                IncidentType = "TRAFFIC_FLOOD",
                FailureReason = $"Rate limit exceeded for client IP. Sustained bursts: {ipViolations}.",
                SourceClassification = "UNTRUSTED"
            };
        }

        // -------------------------------------------------------------
        // Rule 2: Registered Device Lookup (No fallback to Node-01)
        // -------------------------------------------------------------
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            await RecordIncidentFallbackAsync("UNKNOWN_DEVICE", "CRITICAL", "missing_device_id", clientIp,
                null, null, "Telemetry ingest rejected: missing X-Device-Id header.", "UNTRUSTED");

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "UNKNOWN_DEVICE",
                FailureReason = "Missing X-Device-Id header.",
                SourceClassification = "UNTRUSTED"
            };
        }

        var normalizedDeviceId = deviceId.Trim();
        EdgeNode? node = null;
        if (IsDatabaseReachable)
        {
            try
            {
                node = await _db.EdgeNodes
                    .Include(n => n.Patient)
                    .FirstOrDefaultAsync(n => n.NodeName.ToLower() == normalizedDeviceId.ToLower() ||
                                              n.HardwareMac.ToLower() == normalizedDeviceId.ToLower() ||
                                              n.IotHubDeviceId == normalizedDeviceId);
            }
            catch (Exception ex)
            {
                IsDatabaseReachable = false;
                _logger.LogWarning("Database offline; switched to development edge node registry: {Message}", ex.Message);
            }
        }

        if (node == null && !IsDatabaseReachable)
        {
            if (normalizedDeviceId.Equals("Node-01", StringComparison.OrdinalIgnoreCase) ||
                normalizedDeviceId.Equals("AA:BB:CC:DD:EE:01", StringComparison.OrdinalIgnoreCase))
            {
                node = DevNode01;
            }
            else if (normalizedDeviceId.Equals("Node-02", StringComparison.OrdinalIgnoreCase) ||
                     normalizedDeviceId.Equals("AA:BB:CC:DD:EE:02", StringComparison.OrdinalIgnoreCase))
            {
                node = DevNode02;
            }
        }

        if (node == null)
        {
            await RecordIncidentFallbackAsync("UNKNOWN_DEVICE", "CRITICAL", normalizedDeviceId, clientIp,
                null, null, $"Unrecognized/unregistered device ID '{normalizedDeviceId}' attempted telemetry ingest.", "UNTRUSTED");

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "UNKNOWN_DEVICE",
                FailureReason = $"Device '{normalizedDeviceId}' is not a registered clinical edge node.",
                SourceClassification = "UNTRUSTED"
            };
        }

        // -------------------------------------------------------------
        // Rule 1b: Device-Specific Token-Bucket Rate Limiting
        // -------------------------------------------------------------
        var profile = GetDeviceRateLimitProfile(node.NodeName);
        var devKey = $"dev:{node.NodeName}";
        var (devAllowed, devViolations, _) = CheckTokenBucketRateLimit(devKey, profile.BurstCapacity, profile.RefillRatePerSecond);
        if (!devAllowed)
        {
            if (devViolations >= _sustainedViolationThreshold)
            {
                await RecordSecurityIncidentAsync(node.HospitalId, "TRAFFIC_FLOOD", "WARNING", node.NodeName, clientIp,
                    null, null, $"Sustained rate limit exceeded for device '{node.NodeName}' ({devViolations} consecutive bursts).", node.SourceClassification);
            }

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 429,
                IncidentType = "TRAFFIC_FLOOD",
                FailureReason = $"Rate limit exceeded for device '{node.NodeName}'. Sustained bursts: {devViolations}.",
                SourceClassification = node.SourceClassification
            };
        }

        // -------------------------------------------------------------
        // Rule 3: HMAC-SHA256 Verification against raw request body bytes
        // -------------------------------------------------------------
        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            await RecordSecurityIncidentAsync(node.HospitalId, "INVALID_SIGNATURE", "CRITICAL", node.NodeName, clientIp,
                null, null, "Missing X-Signature authentication header.", node.SourceClassification);

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "INVALID_SIGNATURE",
                FailureReason = "Missing X-Signature header.",
                SourceClassification = node.SourceClassification
            };
        }

        if (string.IsNullOrWhiteSpace(sequenceHeader) || !long.TryParse(sequenceHeader.Trim(), out var sequenceNumber))
        {
            await RecordSecurityIncidentAsync(node.HospitalId, "INVALID_SEQUENCE", "HIGH", node.NodeName, clientIp,
                null, null, $"Missing or unparseable X-Sequence-Number header: '{sequenceHeader}'.", node.SourceClassification);

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "INVALID_SEQUENCE",
                FailureReason = "Invalid or missing X-Sequence-Number header.",
                SourceClassification = node.SourceClassification
            };
        }

        if (string.IsNullOrWhiteSpace(timestampHeader))
        {
            await RecordSecurityIncidentAsync(node.HospitalId, "INVALID_TIMESTAMP", "HIGH", node.NodeName, clientIp,
                sequenceNumber, null, "Missing X-Timestamp header.", node.SourceClassification);

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "INVALID_TIMESTAMP",
                FailureReason = "Missing X-Timestamp header.",
                SourceClassification = node.SourceClassification
            };
        }

        var secret = GetDeviceSecret(node.NodeName) ?? GetDeviceSecret(node.HardwareMac);
        if (string.IsNullOrEmpty(secret))
        {
            _logger.LogError("No shared secret configured for registered device '{NodeName}'.", node.NodeName);
            await RecordSecurityIncidentAsync(node.HospitalId, "INVALID_SIGNATURE", "CRITICAL", node.NodeName, clientIp,
                sequenceNumber, null, $"Device '{node.NodeName}' has no provisioned secret in environment/vault.", node.SourceClassification);

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "INVALID_SIGNATURE",
                FailureReason = $"No shared secret provisioned for device '{node.NodeName}'.",
                SourceClassification = node.SourceClassification
            };
        }

        byte[] receivedSigBytes;
        try
        {
            receivedSigBytes = Convert.FromHexString(signatureHeader.Trim());
        }
        catch (FormatException)
        {
            await RecordSecurityIncidentAsync(node.HospitalId, "INVALID_SIGNATURE", "CRITICAL", node.NodeName, clientIp,
                sequenceNumber, null, "X-Signature header contains invalid non-hex characters.", node.SourceClassification);

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "INVALID_SIGNATURE",
                FailureReason = "Malformed X-Signature (must be hexadecimal).",
                SourceClassification = node.SourceClassification
            };
        }

        // Canonical string: "{deviceId}\n{sequenceNumber}\n{timestampIso}\n" + rawBodyBytes
        var headerPrefixBytes = Encoding.UTF8.GetBytes($"{node.NodeName}\n{sequenceNumber}\n{timestampHeader.Trim()}\n");
        var canonicalBytes = new byte[headerPrefixBytes.Length + rawBodyBytes.Length];
        Buffer.BlockCopy(headerPrefixBytes, 0, canonicalBytes, 0, headerPrefixBytes.Length);
        Buffer.BlockCopy(rawBodyBytes, 0, canonicalBytes, headerPrefixBytes.Length, rawBodyBytes.Length);

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var computedHash = hmac.ComputeHash(canonicalBytes);

        if (!CryptographicOperations.FixedTimeEquals(computedHash, receivedSigBytes))
        {
            await RecordSecurityIncidentAsync(node.HospitalId, "INVALID_SIGNATURE", "CRITICAL", node.NodeName, clientIp,
                sequenceNumber, null, "HMAC-SHA256 signature verification failed. Payload or headers tampered.", node.SourceClassification);

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "INVALID_SIGNATURE",
                FailureReason = "HMAC verification failed. Payload tampering or invalid credential.",
                SourceClassification = node.SourceClassification
            };
        }

        // -------------------------------------------------------------
        // Rule 4: Timestamp Freshness Verification (Clock Skew Window)
        // -------------------------------------------------------------
        if (!DateTime.TryParse(timestampHeader.Trim(), CultureInfo.InvariantCulture,
                DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var packetUtc))
        {
            await RecordSecurityIncidentAsync(node.HospitalId, "INVALID_TIMESTAMP", "HIGH", node.NodeName, clientIp,
                sequenceNumber, null, $"X-Timestamp could not be parsed as ISO-8601 UTC: '{timestampHeader}'.", node.SourceClassification);

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "INVALID_TIMESTAMP",
                FailureReason = "Unparseable ISO-8601 UTC timestamp.",
                SourceClassification = node.SourceClassification
            };
        }

        var skewSeconds = Math.Abs((DateTime.UtcNow - packetUtc).TotalSeconds);
        if (skewSeconds > _allowedTimestampSkewSeconds)
        {
            await RecordSecurityIncidentAsync(node.HospitalId, "REPLAY_ATTACK", "CRITICAL", node.NodeName, clientIp,
                sequenceNumber, null, $"Packet timestamp {packetUtc:o} outside allowed freshness window of {_allowedTimestampSkewSeconds}s (skew: {Math.Round(skewSeconds, 1)}s).", node.SourceClassification);

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "REPLAY_ATTACK",
                FailureReason = $"Packet timestamp expired or outside allowed freshness window (skew: {Math.Round(skewSeconds, 1)}s).",
                SourceClassification = node.SourceClassification
            };
        }

        // -------------------------------------------------------------
        // Rule 5: Sequence Number Monotonicity (Replay Check)
        // -------------------------------------------------------------
        var lastSeq = Math.Max(node.LastSequenceNumber, _inMemoryNodeSequences.GetValueOrDefault(node.Id, 0L));
        if (sequenceNumber <= lastSeq)
        {
            await RecordSecurityIncidentAsync(node.HospitalId, "REPLAY_ATTACK", "CRITICAL", node.NodeName, clientIp,
                sequenceNumber, lastSeq + 1,
                $"Replay detected: received sequence {sequenceNumber} <= last accepted sequence {lastSeq}.", node.SourceClassification);

            return new TelemetryValidationResult
            {
                IsValid = false,
                StatusCode = 401,
                IncidentType = "REPLAY_ATTACK",
                FailureReason = $"Replay attack: sequence {sequenceNumber} is not greater than last accepted sequence {lastSeq}.",
                SourceClassification = node.SourceClassification
            };
        }

        // All 5 rules passed cleanly
        return new TelemetryValidationResult
        {
            IsValid = true,
            StatusCode = 200,
            Node = node,
            ParsedSequenceNumber = sequenceNumber,
            SourceClassification = node.SourceClassification
        };
    }

    public async Task<bool> CommitSequenceAndTelemetryAsync(
        Guid nodeId,
        long newSequenceNumber,
        TelemetryLiveVital vital,
        Patient? patient,
        decimal seizureProbability)
    {
        // Concurrency-safe atomic update using conditional WHERE clause.
        // If two simultaneous requests pass initial checks, only the first one to execute the UPDATE
        // will get rowsAffected == 1. The second will get rowsAffected == 0 and be rejected.
        if (!IsDatabaseReachable)
        {
            lock (InMemoryLock)
            {
                var currentSeq = _inMemoryNodeSequences.GetOrAdd(nodeId, 0L);
                if (newSequenceNumber <= currentSeq)
                {
                    return false;
                }
                _inMemoryNodeSequences[nodeId] = newSequenceNumber;
                return true;
            }
        }

        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync();
            var now = DateTime.UtcNow;
            var rowsAffected = await _db.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE edge_nodes SET last_sequence_number = {newSequenceNumber}, last_heartbeat = {now}, updated_at = {now} WHERE id = {nodeId} AND last_sequence_number < {newSequenceNumber}");

            if (rowsAffected == 0)
            {
                await transaction.RollbackAsync();
                _logger.LogWarning("Atomic sequence commit race condition detected on Node {NodeId} for Seq {Seq}.", nodeId, newSequenceNumber);
                return false;
            }

            _db.TelemetryLiveVitals.Add(vital);

            if (patient != null)
            {
                if (seizureProbability >= 0.70m)
                {
                    patient.Status = PatientStatus.Critical;
                }
                else if (patient.Status == PatientStatus.Critical && seizureProbability < 0.40m)
                {
                    patient.Status = PatientStatus.Monitoring;
                }
                patient.UpdatedAt = now;
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            _inMemoryNodeSequences[nodeId] = newSequenceNumber;
            return true;
        }
        catch (Exception ex)
        {
            IsDatabaseReachable = false;
            _logger.LogWarning(ex, "Database offline or transaction failed; performing in-memory atomic sequence commit for node {NodeId}", nodeId);
            lock (InMemoryLock)
            {
                var currentSeq = _inMemoryNodeSequences.GetOrAdd(nodeId, 0L);
                if (newSequenceNumber <= currentSeq)
                {
                    return false;
                }
                _inMemoryNodeSequences[nodeId] = newSequenceNumber;
                return true;
            }
        }
    }

    public string ComputeHmacSha256(string deviceId, long sequenceNumber, string timestampIso, byte[] rawBodyBytes, string secret)
    {
        var headerPrefixBytes = Encoding.UTF8.GetBytes($"{deviceId}\n{sequenceNumber}\n{timestampIso}\n");
        var canonicalBytes = new byte[headerPrefixBytes.Length + rawBodyBytes.Length];
        Buffer.BlockCopy(headerPrefixBytes, 0, canonicalBytes, 0, headerPrefixBytes.Length);
        Buffer.BlockCopy(rawBodyBytes, 0, canonicalBytes, headerPrefixBytes.Length, rawBodyBytes.Length);

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(canonicalBytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public string? GetDeviceSecret(string deviceId)
    {
        // 1. Check exact env variable: DEVICE_SECRET_NODE_01, DEVICE_SECRET_NODE_02, etc.
        var sanitized = deviceId.Replace("-", "_").Replace(" ", "_").Replace(".", "_").ToUpperInvariant();
        var envSecret = Environment.GetEnvironmentVariable($"DEVICE_SECRET_{sanitized}");
        if (!string.IsNullOrEmpty(envSecret)) return envSecret;

        // 2. Check configuration (e.g. appsettings.json or Azure App Config)
        var configSecret = _config[$"NeuroShield:DeviceSecrets:{deviceId}"]
                           ?? _config[$"NeuroShield:DeviceSecrets:{sanitized}"];
        if (!string.IsNullOrEmpty(configSecret)) return configSecret;

        // 3. Check general fallback dev secret from environment variable
        var defaultEnvSecret = Environment.GetEnvironmentVariable("NEUROSHIELD_DEFAULT_DEVICE_SECRET");
        if (!string.IsNullOrEmpty(defaultEnvSecret)) return defaultEnvSecret;

        // 4. Default configuration fallback for local development
        return _config["NeuroShield:DefaultDeviceSecret"];
    }

    public (bool Allowed, int ConsecutiveViolations, double RemainingTokens) CheckTokenBucketRateLimit(
        string key, double burstCapacity, double refillRatePerSecond)
    {
        var bucket = _tokenBuckets.GetOrAdd(key, _ => new TokenBucket(burstCapacity, refillRatePerSecond));
        return bucket.TryConsume(1.0);
    }

    public RateLimitProfileDto GetDeviceRateLimitProfile(string deviceName)
    {
        var section = _config.GetSection($"NeuroShield:RateLimiting:DeviceProfiles:{deviceName}");
        if (section.Exists())
        {
            var burst = double.TryParse(section["BurstCapacity"], out var b) ? b : _defaultBurstCapacity;
            var refill = double.TryParse(section["RefillRatePerSecond"], out var r) ? r : _defaultRefillRate;
            var classif = section["SourceClassification"] ?? "SIMULATOR";
            return new RateLimitProfileDto(deviceName, burst, refill, classif);
        }

        if (deviceName.Equals("Node-02", StringComparison.OrdinalIgnoreCase))
        {
            return new RateLimitProfileDto(deviceName, _defaultBurstCapacity, _defaultRefillRate, "PHYSICAL");
        }

        return new RateLimitProfileDto(deviceName, _defaultBurstCapacity, _defaultRefillRate, "SIMULATOR");
    }

    public SecurityConfigSummaryDto GetSecurityConfiguration()
    {
        var profiles = new List<RateLimitProfileDto>();
        var devProfilesSection = _config.GetSection("NeuroShield:RateLimiting:DeviceProfiles");
        if (devProfilesSection.Exists())
        {
            foreach (var child in devProfilesSection.GetChildren())
            {
                var burst = double.TryParse(child["BurstCapacity"], out var b) ? b : _defaultBurstCapacity;
                var refill = double.TryParse(child["RefillRatePerSecond"], out var r) ? r : _defaultRefillRate;
                var classif = child["SourceClassification"] ?? "SIMULATOR";
                profiles.Add(new RateLimitProfileDto(child.Key, burst, refill, classif));
            }
        }
        else
        {
            profiles.Add(new RateLimitProfileDto("Node-01", _defaultBurstCapacity, _defaultRefillRate, "SIMULATOR"));
            profiles.Add(new RateLimitProfileDto("Node-02", _defaultBurstCapacity, _defaultRefillRate, "PHYSICAL"));
        }

        return new SecurityConfigSummaryDto(
            _defaultBurstCapacity,
            _defaultRefillRate,
            _ipBurstCapacity,
            _ipRefillRate,
            _sustainedViolationThreshold,
            _allowedTimestampSkewSeconds,
            profiles
        );
    }

    public async Task RecordSecurityIncidentAsync(
        Guid hospitalId,
        string incidentType,
        string severity,
        string deviceId,
        string? sourceIp,
        long? sequenceReceived,
        long? expectedMinSequence,
        string detailMessage,
        string sourceClassification = "UNTRUSTED")
    {
        var incident = new SecurityIncident
        {
            Id = Guid.NewGuid(),
            HospitalId = hospitalId == Guid.Empty ? DevHospitalId : hospitalId,
            IncidentType = incidentType,
            Severity = severity,
            DeviceId = deviceId,
            SourceIp = sourceIp,
            SequenceNumberReceived = sequenceReceived,
            ExpectedMinSequence = expectedMinSequence,
            TimestampReceived = DateTime.UtcNow,
            DetailMessage = detailMessage,
            IsResolved = false,
            CreatedAt = DateTime.UtcNow,
            SourceClassification = sourceClassification
        };

        lock (InMemoryLock)
        {
            InMemoryIncidents.Insert(0, incident);
            if (InMemoryIncidents.Count > 500) InMemoryIncidents.RemoveAt(InMemoryIncidents.Count - 1);
        }

        if (IsDatabaseReachable)
        {
            try
            {
                _db.SecurityIncidents.Add(incident);
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                IsDatabaseReachable = false;
                _logger.LogWarning("Database offline; security incident saved to memory: {Message}", ex.Message);
            }
        }

        try
        {
            // Broadcast real-time security alert through existing AlertsHub to ADMINs in hospital group
            // (Zero patient PII, zero EEG samples)
            var targetHospitalId = incident.HospitalId;
            await _alertsHub.Clients.Group($"alerts_{targetHospitalId}").SendAsync("ReceiveSecurityAlert", new SecurityAlertDto(
                incident.Id,
                incident.IncidentType,
                incident.Severity,
                incident.DeviceId,
                incident.SourceIp,
                incident.SequenceNumberReceived,
                incident.ExpectedMinSequence,
                incident.TimestampReceived.ToString("o"),
                incident.DetailMessage,
                incident.SourceClassification
            ));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast security alert via AlertsHub");
        }
    }

    private async Task RecordIncidentFallbackAsync(
        string incidentType,
        string severity,
        string deviceId,
        string? sourceIp,
        long? sequenceReceived,
        long? expectedMinSequence,
        string detailMessage,
        string sourceClassification = "UNTRUSTED")
    {
        if (IsDatabaseReachable)
        {
            try
            {
                var hospital = await _db.Hospitals.FirstOrDefaultAsync();
                var hospitalId = hospital?.Id ?? DevHospitalId;
                await RecordSecurityIncidentAsync(hospitalId, incidentType, severity, deviceId, sourceIp, sequenceReceived, expectedMinSequence, detailMessage, sourceClassification);
                return;
            }
            catch (Exception)
            {
                IsDatabaseReachable = false;
            }
        }

        await RecordSecurityIncidentAsync(DevHospitalId, incidentType, severity, deviceId, sourceIp, sequenceReceived, expectedMinSequence, detailMessage, sourceClassification);
    }
}
