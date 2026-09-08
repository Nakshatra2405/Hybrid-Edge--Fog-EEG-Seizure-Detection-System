using Microsoft.EntityFrameworkCore;
using EegSeizureBackend.Models;

namespace EegSeizureBackend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Hospital> Hospitals => Set<Hospital>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Admin> Admins => Set<Admin>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Nurse> Nurses => Set<Nurse>();
    public DbSet<Technician> Technicians => Set<Technician>();
    public DbSet<DoctorNurseAssignment> DoctorNurseAssignments => Set<DoctorNurseAssignment>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<EdgeNode> EdgeNodes => Set<EdgeNode>();
    public DbSet<AiModel> AiModels => Set<AiModel>();
    public DbSet<TelemetryLiveVital> TelemetryLiveVitals => Set<TelemetryLiveVital>();
    public DbSet<ClinicalEegSession> ClinicalEegSessions => Set<ClinicalEegSession>();
    public DbSet<AdminNotification> AdminNotifications => Set<AdminNotification>();
    public DbSet<AuditTelemetryLog> AuditTelemetryLogs => Set<AuditTelemetryLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // PostgreSQL Enum Registrations
        modelBuilder.HasPostgresEnum<UserRole>("user_role");
        modelBuilder.HasPostgresEnum<PatientStatus>("patient_status");
        modelBuilder.HasPostgresEnum<GenderEnum>("gender_enum");
        modelBuilder.HasPostgresEnum<NodeStatus>("node_status");
        modelBuilder.HasPostgresEnum<EegClassification>("eeg_classification");
        modelBuilder.HasPostgresEnum<TechApprovalStatus>("tech_approval_status");
        modelBuilder.HasPostgresEnum<RequestType>("request_type");
        modelBuilder.HasPostgresEnum<RequestStatus>("request_status");
        modelBuilder.HasPostgresEnum<LogSeverity>("log_severity");
        modelBuilder.HasPostgresEnum<LogEventType>("log_event_type");
        modelBuilder.HasPostgresEnum<ModelDeploymentStatus>("model_deployment_status");

        // Hospitals
        modelBuilder.Entity<Hospital>()
            .HasIndex(h => h.Code)
            .IsUnique();

        // Users
        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.HospitalId, u.Email })
            .IsUnique();

        // Admins
        modelBuilder.Entity<Admin>()
            .HasOne(a => a.User)
            .WithOne(u => u.Admin)
            .HasForeignKey<Admin>(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Doctors
        modelBuilder.Entity<Doctor>()
            .HasOne(d => d.User)
            .WithOne(u => u.Doctor)
            .HasForeignKey<Doctor>(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Nurses
        modelBuilder.Entity<Nurse>()
            .HasOne(n => n.User)
            .WithOne(u => u.Nurse)
            .HasForeignKey<Nurse>(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Technicians
        modelBuilder.Entity<Technician>()
            .HasOne(t => t.User)
            .WithOne(u => u.Technician)
            .HasForeignKey<Technician>(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // DoctorNurseAssignment
        modelBuilder.Entity<DoctorNurseAssignment>()
            .HasIndex(dna => new { dna.DoctorId, dna.NurseId })
            .IsUnique();

        // Patients
        modelBuilder.Entity<Patient>()
            .HasIndex(p => new { p.HospitalId, p.Mrn })
            .IsUnique();

        // EdgeNodes
        modelBuilder.Entity<EdgeNode>()
            .HasIndex(e => new { e.HospitalId, e.HardwareMac })
            .IsUnique();
    }
}
