using EegSeizureBackend.Models;

namespace EegSeizureBackend.DTOs;

// ================= AUTH DTOs =================
public record LoginRequest(string Email, string Password);

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    Guid HospitalId,
    string? Department,
    string? AvatarUrl
);

public record LoginResponse(
    string AccessToken,
    string TokenType,
    UserDto User
);

// ================= PATIENT DTOs =================
public record PatientCreateDto(
    string Mrn,
    string FirstName,
    string LastName,
    string Dob,
    string Gender,
    string? BloodGroup,
    string AssignedFloor,
    string Room,
    Guid? AssignedDoctorId,
    Guid? AssignedNurseId
);

public record PatientUpdateDto(
    string? AssignedFloor,
    string? Room,
    Guid? AssignedDoctorId,
    Guid? AssignedNurseId,
    string? Status
);

public record PatientResponseDto(
    Guid Id,
    string Mrn,
    string Name,
    int Age,
    string Dob,
    string Gender,
    string? BloodGroup,
    string Status,
    string Room,
    string Floor,
    string DoctorName,
    Guid? DoctorId,
    string NurseName,
    Guid? NurseId,
    string TimeAdded,
    string Battery,
    string Node,
    decimal SeizureProbability,
    int EdgeLatencyMs
);

public record PatientDischargeDto(string? DischargeNotes);

// ================= CLINICAL EEG DTOs =================
public record ClinicalSessionDto(
    Guid SessionId,
    Guid PatientId,
    string PatientName,
    string DoctorName,
    string StartTimestamp,
    string EndTimestamp,
    string Duration,
    string EdgeNode,
    decimal MaxSeizureProbability,
    string Classification,
    int DataPointsCount,
    bool IsApprovedForTraining,
    string? ApprovedTimestamp,
    string TechnicianStatus
);

public record SendTrainingResponseDto(
    string Status,
    int SamplesUploaded,
    string DestinationContainer
);

// ================= AI MODEL DTOs =================
public record ConfusionMatrixDto(
    int TruePositive,
    int FalsePositive,
    int TrueNegative,
    int FalseNegative
);

public record ModelResponseDto(
    Guid Id,
    string VersionName,
    string TrainedDate,
    string TrainedBy,
    int SampleCount,
    decimal Accuracy,
    decimal Precision,
    decimal Recall,
    decimal F1Score,
    ConfusionMatrixDto ConfusionMatrix,
    bool IsDeployed,
    string? DeployedDate
);

public record TriggerTrainingDto(string VersionName);

public record WebhookTrainingCompleteDto(
    string VersionName,
    decimal Accuracy,
    decimal Precision,
    decimal Recall,
    decimal F1Score,
    int TruePositive,
    int FalsePositive,
    int TrueNegative,
    int FalseNegative,
    string? ModelBlobUrl
);

public record DeployModelDto(string? TargetNode);

// ================= NOTIFICATION DTOs =================
public record AdmissionRequestDto(
    string PatientName,
    string? RequestedRoom,
    Guid? AssignedNurseId,
    string Details
);

public record DischargeRequestDto(
    Guid PatientId,
    string Details
);

public record CallCodeDto(
    string Room,
    string? PatientName,
    string Details
);

public record ResolveNotificationDto(
    string Status, // APPROVED or REJECTED
    string? Details
);

public record NotificationResponseDto(
    Guid Id,
    string Type,
    Guid? PatientId,
    string PatientName,
    string RequestedByDoctor,
    Guid RequestedByDoctorId,
    string? AssignedNurse,
    string? RequestedRoom,
    string Timestamp,
    string Details,
    string Status
);

// ================= STAFF DTOs =================
public record CreateStaffDto(
    string Email,
    string Password,
    string FullName,
    string Role,
    string? Department,
    string? LicenseNumber,
    string? AssignedFloor
);

public record UpdateStaffRoleDto(
    string Role,
    string? AssignedFloor,
    string? Department
);

public record StaffResponseDto(
    Guid Id,
    Guid UserId,
    string FullName,
    string Email,
    string Role,
    string? Department,
    string? LicenseNumber,
    string? AssignedFloor,
    string JoinedDate,
    bool IsActive
);

// ================= EDGE & TELEMETRY DTOs =================
public record EdgeNodeDto(
    Guid Id,
    string NodeName,
    string HardwareMac,
    string Room,
    int BatteryPercentage,
    string Status,
    string FirmwareVersion,
    string? AssignedPatientName,
    string? ActiveModelVersion,
    string LastHeartbeat
);

public record CreateEdgeNodeDto(
    string NodeName,
    string HardwareMac,
    string Room
);

public record SystemMetricsDto(
    int TotalPatients,
    int CriticalCount,
    int OnlineNodesCount,
    decimal AverageLatencyMs,
    decimal ModelSensitivityPercent,
    decimal ModelF1Score
);

public record AuditLogDto(
    long Id,
    string EventType,
    string Severity,
    string Title,
    string? Description,
    string Timestamp
);
