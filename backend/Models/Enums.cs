using NpgsqlTypes;

namespace EegSeizureBackend.Models;

public enum UserRole
{
    [PgName("ADMIN")]
    ADMIN,
    [PgName("DOCTOR")]
    DOCTOR,
    [PgName("NURSE")]
    NURSE,
    [PgName("TECHNICIAN")]
    TECHNICIAN
}

public enum PatientStatus
{
    [PgName("Critical")]
    Critical,
    [PgName("Monitoring")]
    Monitoring,
    [PgName("Stable")]
    Stable,
    [PgName("Discharged")]
    Discharged
}

public enum GenderEnum
{
    [PgName("Male")]
    Male,
    [PgName("Female")]
    Female,
    [PgName("Other")]
    Other
}

public enum NodeStatus
{
    [PgName("ONLINE")]
    ONLINE,
    [PgName("OFFLINE")]
    OFFLINE,
    [PgName("ALERT")]
    ALERT,
    [PgName("DISCONNECTED")]
    DISCONNECTED
}

public enum EegClassification
{
    [PgName("Ictal Seizure Event")]
    Ictal_Seizure_Event,
    [PgName("Pre-Ictal Warning")]
    Pre_Ictal_Warning,
    [PgName("Normal Baseline")]
    Normal_Baseline
}

public enum TechApprovalStatus
{
    [PgName("Pending Technician Review")]
    Pending_Technician_Review,
    [PgName("Added to Training")]
    Added_to_Training,
    [PgName("Approved for Training")]
    Approved_for_Training,
    [PgName("Rejected")]
    Rejected
}

public enum RequestType
{
    [PgName("admission_request")]
    admission_request,
    [PgName("discharge_request")]
    discharge_request,
    [PgName("call_code")]
    call_code
}

public enum RequestStatus
{
    [PgName("PENDING")]
    PENDING,
    [PgName("APPROVED")]
    APPROVED,
    [PgName("REJECTED")]
    REJECTED
}

public enum LogSeverity
{
    [PgName("CRITICAL")]
    CRITICAL,
    [PgName("WARNING")]
    WARNING,
    [PgName("INFO")]
    INFO,
    [PgName("SUCCESS")]
    SUCCESS
}

public enum LogEventType
{
    [PgName("LOGIN")]
    LOGIN,
    [PgName("LOGOUT")]
    LOGOUT,
    [PgName("CALL_CODE")]
    CALL_CODE,
    [PgName("SEIZURE_ALERT")]
    SEIZURE_ALERT,
    [PgName("DISCHARGE_REQUEST")]
    DISCHARGE_REQUEST,
    [PgName("ADMISSION_REQUEST")]
    ADMISSION_REQUEST,
    [PgName("MODEL_DEPLOYMENT")]
    MODEL_DEPLOYMENT,
    [PgName("BATTERY_LOW")]
    BATTERY_LOW,
    [PgName("NODE_OFFLINE")]
    NODE_OFFLINE,
    [PgName("ROLE_ASSIGNED")]
    ROLE_ASSIGNED,
    [PgName("TRAINING_TRIGGERED")]
    TRAINING_TRIGGERED
}

public enum ModelDeploymentStatus
{
    [PgName("Pending")]
    Pending,
    [PgName("Deploying")]
    Deploying,
    [PgName("Live")]
    Live,
    [PgName("Failed")]
    Failed
}
