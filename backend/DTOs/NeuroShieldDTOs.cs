using EegSeizureBackend.Models;

namespace EegSeizureBackend.DTOs;

public class TelemetryValidationResult
{
    public bool IsValid { get; set; }
    public int StatusCode { get; set; } = 200;
    public string? FailureReason { get; set; }
    public string? IncidentType { get; set; }
    public string Severity { get; set; } = "WARNING";
    public EdgeNode? Node { get; set; }
    public long ParsedSequenceNumber { get; set; }
    public string SourceClassification { get; set; } = "UNTRUSTED";
}

public record SecurityAlertDto(
    Guid Id,
    string IncidentType,
    string Severity,
    string DeviceId,
    string? SourceIp,
    long? SequenceNumberReceived,
    long? ExpectedMinSequence,
    string TimestampReceived,
    string DetailMessage,
    string SourceClassification = "UNTRUSTED"
);

public record SecurityIncidentResponseDto(
    Guid Id,
    string IncidentType,
    string Severity,
    string DeviceId,
    string? SourceIp,
    long? SequenceNumberReceived,
    long? ExpectedMinSequence,
    string TimestampReceived,
    string DetailMessage,
    bool IsResolved,
    string? ResolvedAt,
    string SourceClassification = "UNTRUSTED"
);

public record RateLimitProfileDto(
    string DeviceId,
    double BurstCapacity,
    double RefillRatePerSecond,
    string Classification
);

public record SecurityConfigSummaryDto(
    double DefaultBurstCapacity,
    double DefaultRefillRate,
    double IpBurstCapacity,
    double IpRefillRate,
    int SustainedViolationThreshold,
    int TimestampSkewSeconds,
    List<RateLimitProfileDto> RegisteredProfiles
);
