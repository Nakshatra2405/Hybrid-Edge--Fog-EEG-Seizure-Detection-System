using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EegSeizureBackend.Models;

[Table("hospitals")]
public class Hospital
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(255)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("code")]
    public string Code { get; set; } = string.Empty;

    [Column("address")]
    public string? Address { get; set; }

    [MaxLength(100)]
    [Column("city")]
    public string? City { get; set; }

    [MaxLength(100)]
    [Column("state")]
    public string? State { get; set; }

    [MaxLength(100)]
    [Column("country")]
    public string Country { get; set; } = "India";

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Patient> Patients { get; set; } = new List<Patient>();
    public ICollection<EdgeNode> EdgeNodes { get; set; } = new List<EdgeNode>();
    public ICollection<AiModel> AiModels { get; set; } = new List<AiModel>();
}

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [ForeignKey(nameof(HospitalId))]
    public Hospital? Hospital { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("full_name")]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [Column("role")]
    public UserRole Role { get; set; }

    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("is_deleted")]
    public bool IsDeleted { get; set; } = false;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Admin? Admin { get; set; }
    public Doctor? Doctor { get; set; }
    public Nurse? Nurse { get; set; }
    public Technician? Technician { get; set; }
}

[Table("admins")]
public class Admin
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [ForeignKey(nameof(HospitalId))]
    public Hospital? Hospital { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("admin_code")]
    public string AdminCode { get; set; } = string.Empty;

    [MaxLength(50)]
    [Column("access_level")]
    public string AccessLevel { get; set; } = "HospitalAdmin";

    [Column("can_assign_roles")]
    public bool CanAssignRoles { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("doctors")]
public class Doctor
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [ForeignKey(nameof(HospitalId))]
    public Hospital? Hospital { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("license_number")]
    public string LicenseNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("specialization")]
    public string Specialization { get; set; } = "Neurology";

    [MaxLength(50)]
    [Column("pager_number")]
    public string? PagerNumber { get; set; }

    [MaxLength(100)]
    [Column("consultation_hours")]
    public string? ConsultationHours { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Patient> AssignedPatients { get; set; } = new List<Patient>();
    public ICollection<DoctorNurseAssignment> NurseAssignments { get; set; } = new List<DoctorNurseAssignment>();
}

[Table("nurses")]
public class Nurse
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [ForeignKey(nameof(HospitalId))]
    public Hospital? Hospital { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("license_number")]
    public string LicenseNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("assigned_floor")]
    public string AssignedFloor { get; set; } = "Floor 4 - ICU";

    [MaxLength(50)]
    [Column("shift_type")]
    public string ShiftType { get; set; } = "Morning";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Patient> AssignedPatients { get; set; } = new List<Patient>();
    public ICollection<DoctorNurseAssignment> DoctorAssignments { get; set; } = new List<DoctorNurseAssignment>();
}

[Table("technicians")]
public class Technician
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [ForeignKey(nameof(HospitalId))]
    public Hospital? Hospital { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<AiModel> TrainedModels { get; set; } = new List<AiModel>();
}

[Table("doctor_nurse_assignments")]
public class DoctorNurseAssignment
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [ForeignKey(nameof(HospitalId))]
    public Hospital? Hospital { get; set; }

    [Required]
    [Column("doctor_id")]
    public Guid DoctorId { get; set; }

    [ForeignKey(nameof(DoctorId))]
    public Doctor? Doctor { get; set; }

    [Required]
    [Column("nurse_id")]
    public Guid NurseId { get; set; }

    [ForeignKey(nameof(NurseId))]
    public Nurse? Nurse { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("patients")]
public class Patient
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [ForeignKey(nameof(HospitalId))]
    public Hospital? Hospital { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("mrn")]
    public string Mrn { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("last_name")]
    public string LastName { get; set; } = string.Empty;

    [Column("dob")]
    public DateOnly Dob { get; set; }

    [Column("gender")]
    public GenderEnum Gender { get; set; } = GenderEnum.Male;

    [MaxLength(10)]
    [Column("blood_group")]
    public string? BloodGroup { get; set; }

    [Column("status")]
    public PatientStatus Status { get; set; } = PatientStatus.Monitoring;

    [Required]
    [MaxLength(100)]
    [Column("assigned_floor")]
    public string AssignedFloor { get; set; } = "Floor 4 - ICU";

    [Required]
    [MaxLength(50)]
    [Column("room")]
    public string Room { get; set; } = "402";

    [Column("assigned_doctor_id")]
    public Guid? AssignedDoctorId { get; set; }

    [ForeignKey(nameof(AssignedDoctorId))]
    public Doctor? AssignedDoctor { get; set; }

    [Column("assigned_nurse_id")]
    public Guid? AssignedNurseId { get; set; }

    [ForeignKey(nameof(AssignedNurseId))]
    public Nurse? AssignedNurse { get; set; }

    [Column("is_deleted")]
    public bool IsDeleted { get; set; } = false;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    [Column("discharged_at")]
    public DateTime? DischargedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<EdgeNode> EdgeNodes { get; set; } = new List<EdgeNode>();
    public ICollection<TelemetryLiveVital> TelemetryVitals { get; set; } = new List<TelemetryLiveVital>();
    public ICollection<ClinicalEegSession> EegSessions { get; set; } = new List<ClinicalEegSession>();
}

[Table("edge_nodes")]
public class EdgeNode
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [ForeignKey(nameof(HospitalId))]
    public Hospital? Hospital { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("node_name")]
    public string NodeName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("hardware_mac")]
    public string HardwareMac { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("room")]
    public string Room { get; set; } = "402";

    [Column("patient_id")]
    public Guid? PatientId { get; set; }

    [ForeignKey(nameof(PatientId))]
    public Patient? Patient { get; set; }

    [Column("battery_percentage")]
    public int BatteryPercentage { get; set; } = 100;

    [Column("status")]
    public NodeStatus Status { get; set; } = NodeStatus.ONLINE;

    [MaxLength(50)]
    [Column("firmware_version")]
    public string FirmwareVersion { get; set; } = "v2.4.1";

    [Column("active_model_id")]
    public Guid? ActiveModelId { get; set; }

    [ForeignKey(nameof(ActiveModelId))]
    public AiModel? ActiveModel { get; set; }

    [MaxLength(255)]
    [Column("iot_hub_device_id")]
    public string? IotHubDeviceId { get; set; }

    [MaxLength(255)]
    [Column("current_image_tag")]
    public string? CurrentImageTag { get; set; }

    [Column("last_deployment_at")]
    public DateTime? LastDeploymentAt { get; set; }

    [Column("last_heartbeat")]
    public DateTime LastHeartbeat { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("ai_models")]
public class AiModel
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [ForeignKey(nameof(HospitalId))]
    public Hospital? Hospital { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("version_name")]
    public string VersionName { get; set; } = string.Empty;

    [Column("trained_by_technician_id")]
    public Guid? TrainedByTechnicianId { get; set; }

    [ForeignKey(nameof(TrainedByTechnicianId))]
    public Technician? TrainedByTechnician { get; set; }

    [Column("sample_count")]
    public int SampleCount { get; set; }

    [Column("accuracy", TypeName = "decimal(5,2)")]
    public decimal Accuracy { get; set; }

    [Column("precision", TypeName = "decimal(5,2)")]
    public decimal Precision { get; set; }

    [Column("recall", TypeName = "decimal(5,2)")]
    public decimal Recall { get; set; }

    [Column("f1_score", TypeName = "decimal(5,2)")]
    public decimal F1Score { get; set; }

    [Column("true_positive")]
    public int TruePositive { get; set; }

    [Column("false_positive")]
    public int FalsePositive { get; set; }

    [Column("true_negative")]
    public int TrueNegative { get; set; }

    [Column("false_negative")]
    public int FalseNegative { get; set; }

    [Column("model_binary_path")]
    public string? ModelBinaryPath { get; set; }

    [MaxLength(255)]
    [Column("azure_model_run_id")]
    public string? AzureModelRunId { get; set; }

    [MaxLength(255)]
    [Column("azure_acr_image_tag")]
    public string? AzureAcrImageTag { get; set; }

    [Column("deployment_status")]
    public ModelDeploymentStatus DeploymentStatus { get; set; } = ModelDeploymentStatus.Pending;

    [Column("is_deployed")]
    public bool IsDeployed { get; set; } = false;

    [Column("deployed_at")]
    public DateTime? DeployedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("telemetry_live_vitals")]
public class TelemetryLiveVital
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required]
    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [ForeignKey(nameof(PatientId))]
    public Patient? Patient { get; set; }

    [Column("edge_node_id")]
    public Guid? EdgeNodeId { get; set; }

    [ForeignKey(nameof(EdgeNodeId))]
    public EdgeNode? EdgeNode { get; set; }

    [Column("seizure_probability", TypeName = "decimal(5,4)")]
    public decimal SeizureProbability { get; set; }

    [Column("edge_latency_ms")]
    public int EdgeLatencyMs { get; set; }

    [Column("eeg_amplitude_uv", TypeName = "decimal(6,2)")]
    public decimal? EegAmplitudeUv { get; set; }

    [Column("battery_percentage")]
    public int? BatteryPercentage { get; set; }

    [Column("recorded_at")]
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}

[Table("clinical_eeg_sessions")]
public class ClinicalEegSession
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required]
    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [ForeignKey(nameof(PatientId))]
    public Patient? Patient { get; set; }

    [Column("doctor_id")]
    public Guid? DoctorId { get; set; }

    [ForeignKey(nameof(DoctorId))]
    public Doctor? Doctor { get; set; }

    [Column("edge_node_id")]
    public Guid? EdgeNodeId { get; set; }

    [ForeignKey(nameof(EdgeNodeId))]
    public EdgeNode? EdgeNode { get; set; }

    [Column("start_time")]
    public DateTime StartTime { get; set; }

    [Column("end_time")]
    public DateTime EndTime { get; set; }

    [Column("duration_seconds")]
    public int DurationSeconds { get; set; }

    [Column("max_seizure_probability", TypeName = "decimal(5,4)")]
    public decimal MaxSeizureProbability { get; set; }

    [Column("classification")]
    public EegClassification Classification { get; set; } = EegClassification.Normal_Baseline;

    [Column("data_points_count")]
    public int DataPointsCount { get; set; }

    [Column("raw_eeg_blob_path")]
    public string? RawEegBlobPath { get; set; }

    [Column("doctor_approved_for_training")]
    public bool DoctorApprovedForTraining { get; set; } = false;

    [Column("approved_at")]
    public DateTime? ApprovedAt { get; set; }

    [Column("technician_status")]
    public TechApprovalStatus TechnicianStatus { get; set; } = TechApprovalStatus.Pending_Technician_Review;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("admin_notifications")]
public class AdminNotification
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Column("type")]
    public RequestType Type { get; set; }

    [Column("patient_id")]
    public Guid? PatientId { get; set; }

    [ForeignKey(nameof(PatientId))]
    public Patient? Patient { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("patient_name")]
    public string PatientName { get; set; } = string.Empty;

    [Required]
    [Column("requested_by_doctor_id")]
    public Guid RequestedByDoctorId { get; set; }

    [ForeignKey(nameof(RequestedByDoctorId))]
    public Doctor? RequestedByDoctor { get; set; }

    [Column("assigned_nurse_id")]
    public Guid? AssignedNurseId { get; set; }

    [ForeignKey(nameof(AssignedNurseId))]
    public Nurse? AssignedNurse { get; set; }

    [Column("assigned_admin_id")]
    public Guid? AssignedAdminId { get; set; }

    [ForeignKey(nameof(AssignedAdminId))]
    public Admin? AssignedAdmin { get; set; }

    [MaxLength(50)]
    [Column("requested_room")]
    public string? RequestedRoom { get; set; }

    [Column("details")]
    public string? Details { get; set; }

    [Column("status")]
    public RequestStatus Status { get; set; } = RequestStatus.PENDING;

    [Column("sent_at")]
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    [Column("received_at")]
    public DateTime? ReceivedAt { get; set; }

    [Column("resolved_at")]
    public DateTime? ResolvedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("audit_telemetry_logs")]
public class AuditTelemetryLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Column("patient_id")]
    public Guid? PatientId { get; set; }

    [Column("user_id")]
    public Guid? UserId { get; set; }

    [Column("event_type")]
    public LogEventType EventType { get; set; }

    [Column("severity")]
    public LogSeverity Severity { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
