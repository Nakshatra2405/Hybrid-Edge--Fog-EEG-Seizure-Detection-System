using Microsoft.EntityFrameworkCore;
using EegSeizureBackend.Models;
using EegSeizureBackend.Services;

namespace EegSeizureBackend.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db, IAuthService auth)
    {
        var hospital = await db.Hospitals.FirstOrDefaultAsync();
        if (hospital == null)
        {
            hospital = new Hospital
            {
                Name = "Metro General Hospital - Epilepsy Center",
                Code = "MGH-EPI-01",
                Address = "100 Medical Center Blvd",
                City = "Boston",
                State = "MA",
                Country = "USA",
                IsActive = true
            };
            db.Hospitals.Add(hospital);
            await db.SaveChangesAsync();
        }

        if (await db.Users.AnyAsync())
        {
            // Ensure all seeded users have valid BCrypt hashes for 'password123'
            var existingUsers = await db.Users.ToListAsync();
            bool hasChanged = false;
            foreach (var u in existingUsers)
            {
                if (!auth.VerifyPassword("password123", u.PasswordHash))
                {
                    u.PasswordHash = auth.HashPassword("password123");
                    hasChanged = true;
                }
            }
            if (hasChanged)
            {
                await db.SaveChangesAsync();
            }
            return; // Users already seeded
        }

        // 2. Create Users across 4 Roles
        string defaultPasswordHash = auth.HashPassword("password123");

        // ADMIN
        var adminUser = new User
        {
            HospitalId = hospital.Id,
            Email = "admin@hospital.com",
            PasswordHash = defaultPasswordHash,
            FullName = "Administrator John Vance",
            Role = UserRole.ADMIN,
            IsActive = true
        };
        db.Users.Add(adminUser);
        await db.SaveChangesAsync();

        db.Admins.Add(new Admin
        {
            UserId = adminUser.Id,
            HospitalId = hospital.Id,
            AdminCode = "ADM-001",
            AccessLevel = "SuperAdmin"
        });

        // DOCTORS (2 Doctors to test scoping)
        var doc1User = new User
        {
            HospitalId = hospital.Id,
            Email = "doctor@hospital.com",
            PasswordHash = defaultPasswordHash,
            FullName = "Dr. Sarah Roberts, MD",
            Role = UserRole.DOCTOR,
            IsActive = true
        };
        var doc2User = new User
        {
            HospitalId = hospital.Id,
            Email = "doctor.chen@hospital.com",
            PasswordHash = defaultPasswordHash,
            FullName = "Dr. Michael Chen, MD",
            Role = UserRole.DOCTOR,
            IsActive = true
        };
        db.Users.AddRange(doc1User, doc2User);
        await db.SaveChangesAsync();

        var doc1 = new Doctor
        {
            UserId = doc1User.Id,
            HospitalId = hospital.Id,
            LicenseNumber = "MD-99412",
            Specialization = "Epileptology & Clinical Neurophysiology",
            PagerNumber = "P-401"
        };
        var doc2 = new Doctor
        {
            UserId = doc2User.Id,
            HospitalId = hospital.Id,
            LicenseNumber = "MD-88123",
            Specialization = "Pediatric Neurology",
            PagerNumber = "P-402"
        };
        db.Doctors.AddRange(doc1, doc2);

        // NURSES (2 Nurses on different floors)
        var nurse1User = new User
        {
            HospitalId = hospital.Id,
            Email = "nurse@hospital.com",
            PasswordHash = defaultPasswordHash,
            FullName = "Elena Rostova, RN",
            Role = UserRole.NURSE,
            IsActive = true
        };
        var nurse2User = new User
        {
            HospitalId = hospital.Id,
            Email = "nurse.marcus@hospital.com",
            PasswordHash = defaultPasswordHash,
            FullName = "Marcus Brody, RN",
            Role = UserRole.NURSE,
            IsActive = true
        };
        db.Users.AddRange(nurse1User, nurse2User);
        await db.SaveChangesAsync();

        var nurse1 = new Nurse
        {
            UserId = nurse1User.Id,
            HospitalId = hospital.Id,
            LicenseNumber = "RN-30012",
            AssignedFloor = "Floor 4 - ICU",
            ShiftType = "Morning"
        };
        var nurse2 = new Nurse
        {
            UserId = nurse2User.Id,
            HospitalId = hospital.Id,
            LicenseNumber = "RN-30045",
            AssignedFloor = "Floor 2 - Ward",
            ShiftType = "Night"
        };
        db.Nurses.AddRange(nurse1, nurse2);

        // TECHNICIAN
        var techUser = new User
        {
            HospitalId = hospital.Id,
            Email = "technician@hospital.com",
            PasswordHash = defaultPasswordHash,
            FullName = "Alex Mercer",
            Role = UserRole.TECHNICIAN,
            IsActive = true
        };
        db.Users.Add(techUser);
        await db.SaveChangesAsync();

        var tech = new Technician
        {
            UserId = techUser.Id,
            HospitalId = hospital.Id
        };
        db.Technicians.Add(tech);
        await db.SaveChangesAsync();

        // 3. Care Team Allocations
        db.DoctorNurseAssignments.Add(new DoctorNurseAssignment
        {
            HospitalId = hospital.Id,
            DoctorId = doc1.Id,
            NurseId = nurse1.Id
        });

        // 4. Patients
        var patient1 = new Patient
        {
            HospitalId = hospital.Id,
            Mrn = "PAT-9082",
            FirstName = "James",
            LastName = "Doe",
            Dob = new DateOnly(1989, 5, 14),
            Gender = GenderEnum.Male,
            BloodGroup = "O+",
            Status = PatientStatus.Critical,
            AssignedFloor = "Floor 4 - ICU",
            Room = "402",
            AssignedDoctorId = doc1.Id,
            AssignedNurseId = nurse1.Id
        };

        var patient2 = new Patient
        {
            HospitalId = hospital.Id,
            Mrn = "PAT-9083",
            FirstName = "Emma",
            LastName = "Watson",
            Dob = new DateOnly(1995, 8, 22),
            Gender = GenderEnum.Female,
            BloodGroup = "A+",
            Status = PatientStatus.Monitoring,
            AssignedFloor = "Floor 4 - ICU",
            Room = "403",
            AssignedDoctorId = doc1.Id,
            AssignedNurseId = nurse1.Id
        };

        var patient3 = new Patient
        {
            HospitalId = hospital.Id,
            Mrn = "PAT-8011",
            FirstName = "Robert",
            LastName = "Chen",
            Dob = new DateOnly(1978, 11, 30),
            Gender = GenderEnum.Male,
            BloodGroup = "B+",
            Status = PatientStatus.Stable,
            AssignedFloor = "Floor 2 - Ward",
            Room = "201",
            AssignedDoctorId = doc2.Id,
            AssignedNurseId = nurse2.Id
        };

        db.Patients.AddRange(patient1, patient2, patient3);
        await db.SaveChangesAsync();

        // 5. AI Models
        var deployedModel = new AiModel
        {
            HospitalId = hospital.Id,
            VersionName = "SeizureNet-v3.2",
            TrainedByTechnicianId = tech.Id,
            SampleCount = 1420,
            Accuracy = 98.40m,
            Precision = 97.90m,
            Recall = 98.10m,
            F1Score = 98.00m,
            TruePositive = 698,
            FalsePositive = 15,
            TrueNegative = 699,
            FalseNegative = 8,
            IsDeployed = true,
            DeploymentStatus = ModelDeploymentStatus.Live,
            DeployedAt = DateTime.UtcNow.AddDays(-2)
        };
        db.AiModels.Add(deployedModel);
        await db.SaveChangesAsync();

        // 6. Edge Nodes (Nano 33 BLE Sense Devices)
        var node1 = new EdgeNode
        {
            HospitalId = hospital.Id,
            NodeName = "Node-01",
            HardwareMac = "E4:5F:01:2A:9C:14",
            Room = "402",
            PatientId = patient1.Id,
            BatteryPercentage = 94,
            Status = NodeStatus.ONLINE,
            ActiveModelId = deployedModel.Id,
            FirmwareVersion = "SeizureNet-v3.2"
        };
        var node2 = new EdgeNode
        {
            HospitalId = hospital.Id,
            NodeName = "Node-02",
            HardwareMac = "E4:5F:01:2A:9C:15",
            Room = "403",
            PatientId = patient2.Id,
            BatteryPercentage = 88,
            Status = NodeStatus.ONLINE,
            ActiveModelId = deployedModel.Id,
            FirmwareVersion = "SeizureNet-v3.2"
        };
        db.EdgeNodes.AddRange(node1, node2);
        await db.SaveChangesAsync();

        // 7. Telemetry Vitals
        db.TelemetryLiveVitals.Add(new TelemetryLiveVital
        {
            HospitalId = hospital.Id,
            PatientId = patient1.Id,
            EdgeNodeId = node1.Id,
            SeizureProbability = 0.9420m,
            EdgeLatencyMs = 14,
            BatteryPercentage = 94,
            RecordedAt = DateTime.UtcNow
        });

        // 8. Clinical EEG Sessions
        db.ClinicalEegSessions.Add(new ClinicalEegSession
        {
            HospitalId = hospital.Id,
            PatientId = patient1.Id,
            DoctorId = doc1.Id,
            EdgeNodeId = node1.Id,
            StartTime = DateTime.UtcNow.AddHours(-2),
            EndTime = DateTime.UtcNow.AddHours(-1),
            DurationSeconds = 3600,
            MaxSeizureProbability = 0.9650m,
            Classification = EegClassification.Ictal_Seizure_Event,
            DataPointsCount = 7200,
            DoctorApprovedForTraining = true,
            ApprovedAt = DateTime.UtcNow.AddMinutes(-30),
            TechnicianStatus = TechApprovalStatus.Pending_Technician_Review
        });

        // 9. Admin Notification
        db.AdminNotifications.Add(new AdminNotification
        {
            HospitalId = hospital.Id,
            Type = RequestType.admission_request,
            PatientName = "David Miller",
            RequestedByDoctorId = doc1.Id,
            AssignedNurseId = nurse1.Id,
            RequestedRoom = "404",
            Details = "Admitting for continuous 24h video-EEG monitoring.",
            Status = RequestStatus.PENDING,
            SentAt = DateTime.UtcNow.AddMinutes(-45)
        });

        await db.SaveChangesAsync();
    }
}
