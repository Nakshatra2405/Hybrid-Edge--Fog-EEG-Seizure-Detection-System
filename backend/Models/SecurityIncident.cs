using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EegSeizureBackend.Models;

[Table("security_incidents")]
public class SecurityIncident
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
    [Column("incident_type")]
    public string IncidentType { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("severity")]
    public string Severity { get; set; } = "WARNING";

    [Required]
    [MaxLength(100)]
    [Column("device_id")]
    public string DeviceId { get; set; } = string.Empty;

    [MaxLength(20)]
    [Column("source_classification")]
    public string SourceClassification { get; set; } = "UNTRUSTED";

    [MaxLength(50)]
    [Column("source_ip")]
    public string? SourceIp { get; set; }

    [Column("sequence_number_received")]
    public long? SequenceNumberReceived { get; set; }

    [Column("expected_min_sequence")]
    public long? ExpectedMinSequence { get; set; }

    [Column("timestamp_received")]
    public DateTime TimestampReceived { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(500)]
    [Column("detail_message")]
    public string DetailMessage { get; set; } = string.Empty;

    [Column("is_resolved")]
    public bool IsResolved { get; set; } = false;

    [Column("resolved_by_user_id")]
    public Guid? ResolvedByUserId { get; set; }

    [ForeignKey(nameof(ResolvedByUserId))]
    public User? ResolvedByUser { get; set; }

    [Column("resolved_at")]
    public DateTime? ResolvedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
