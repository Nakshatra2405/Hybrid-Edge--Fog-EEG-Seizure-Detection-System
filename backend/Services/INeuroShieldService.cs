using EegSeizureBackend.DTOs;
using EegSeizureBackend.Models;

namespace EegSeizureBackend.Services;

public interface INeuroShieldService
{
    /// <summary>
    /// Executes synchronous 4-stage rule validation:
    /// 1. Rate Limiting (per-device and per-IP).
    /// 2. Device Identity lookup (rejects unregistered/unknown nodes without fallback).
    /// 3. HMAC-SHA256 signature verification over exact raw HTTP body bytes.
    /// 4. Timestamp freshness (within allowed clock skew window).
    /// 5. Sequence number validation (must be strictly greater than last accepted sequence).
    /// </summary>
    Task<TelemetryValidationResult> ValidatePacketAsync(
        string? deviceId,
        string? sequenceHeader,
        string? timestampHeader,
        string? signatureHeader,
        byte[] rawBodyBytes,
        string? clientIp);

    /// <summary>
    /// Concurrency-safe atomic database commit: updates edge_node sequence number conditionally 
    /// (WHERE last_sequence_number < newSequenceNumber) and persists clinical vital in a single transaction.
    /// </summary>
    Task<bool> CommitSequenceAndTelemetryAsync(
        Guid nodeId,
        long newSequenceNumber,
        TelemetryLiveVital vital,
        Patient? patient,
        decimal seizureProbability);

    /// <summary>
    /// Computes canonical HMAC-SHA256 for a given payload and secret.
    /// </summary>
    string ComputeHmacSha256(string deviceId, long sequenceNumber, string timestampIso, byte[] rawBodyBytes, string secret);

    /// <summary>
    /// Resolves pre-shared device secret from environment variables or configuration.
    /// </summary>
    string? GetDeviceSecret(string deviceId);

    /// <summary>
    /// In-memory token-bucket rate limit checker with burst tolerance and sustained violation tracking.
    /// </summary>
    (bool Allowed, int ConsecutiveViolations, double RemainingTokens) CheckTokenBucketRateLimit(
        string key, double burstCapacity, double refillRatePerSecond);

    /// <summary>
    /// Retrieves active prototype security and rate limiting configuration.
    /// </summary>
    SecurityConfigSummaryDto GetSecurityConfiguration();

    /// <summary>
    /// Persists a genuine security incident and broadcasts via AlertsHub to ADMINs.
    /// </summary>
    Task RecordSecurityIncidentAsync(
        Guid hospitalId,
        string incidentType,
        string severity,
        string deviceId,
        string? sourceIp,
        long? sequenceReceived,
        long? expectedMinSequence,
        string detailMessage,
        string sourceClassification = "UNTRUSTED");
}
