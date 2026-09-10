using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql;
using EegSeizureBackend.Data;
using EegSeizureBackend.Hubs;
using EegSeizureBackend.Models;
using EegSeizureBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Controllers & Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Hybrid Edge-Fog EEG Seizure Detection API",
        Version = "v1",
        Description = "Production ASP.NET Core 8 Web API with 4-Role RBAC and SignalR Real-Time Telemetry"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 2. Configure PostgreSQL with Npgsql DataSource & Enums
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                       ?? "Host=localhost;Port=5432;Database=eeg_seizure_db;Username=postgres;Password=postgres";

var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.MapEnum<UserRole>("user_role");
dataSourceBuilder.MapEnum<PatientStatus>("patient_status");
dataSourceBuilder.MapEnum<GenderEnum>("gender_enum");
dataSourceBuilder.MapEnum<NodeStatus>("node_status");
dataSourceBuilder.MapEnum<EegClassification>("eeg_classification");
dataSourceBuilder.MapEnum<TechApprovalStatus>("tech_approval_status");
dataSourceBuilder.MapEnum<RequestType>("request_type");
dataSourceBuilder.MapEnum<RequestStatus>("request_status");
dataSourceBuilder.MapEnum<LogSeverity>("log_severity");
dataSourceBuilder.MapEnum<LogEventType>("log_event_type");
dataSourceBuilder.MapEnum<ModelDeploymentStatus>("model_deployment_status");
var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dataSource));

// 3. Add Custom Services
builder.Services.AddScoped<IAuthService, AuthService>();

// 4. Add SignalR (WebSockets)
builder.Services.AddSignalR();

// 5. Add CORS
var allowedOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>() 
                     ?? new[] { "http://localhost:8000", "http://localhost:5173", "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 6. Add JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "SuperSecretEegSeizureDetectionEnterpriseKey_MustBe32CharsOrLonger2026!";
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "EegSeizureBackend";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "EegSeizureDashboard";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ClockSkew = TimeSpan.FromMinutes(5)
    };

    // SignalR Token in Query String handler
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// 7. Seed Demo Data on Startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<AppDbContext>();
        var auth = services.GetRequiredService<IAuthService>();
        await DbInitializer.SeedAsync(db, auth);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// 8. Configure HTTP Middleware Pipeline
if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "EEG Seizure Detection API v1"));
}

app.UseCors("CorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map SignalR Hubs
app.MapHub<TelemetryHub>("/hubs/telemetry");
app.MapHub<AlertsHub>("/hubs/alerts");
app.MapHub<OtaProgressHub>("/hubs/ota");

app.Run("http://localhost:5000");
