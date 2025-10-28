using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddAuthentication("JellyCookie")
    .AddCookie("JellyCookie", options =>
    {
        options.LoginPath = "/api/auth/login";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.None; // dev
        options.SlidingExpiration = true;

        // IMPORTANT pour API
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };

        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy => policy.RequireRole("Admin"));
});

// Ajouter CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // ton frontend React
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // essentiel pour les cookies
    });
});


// Ajouter un cache en mémoire pour stocker la session
builder.Services.AddDistributedMemoryCache();

// Configurer la session
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(60); // expire après 60 min d'inactivité
    options.Cookie.HttpOnly = true; // pas accessible depuis JS (sécurité) - évite les attaques XSS
    options.Cookie.IsEssential = true; // obligatoire pour le fonctionnement
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.None;
});

// Ajouter le DbContext pour EF Core
builder.Services.AddDbContext<MyDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// ensure settings file exists (creates settings.yaml with a random secret if missing)
ConfigYamlHelper.EnsureSettingsFileExists();

// load YAML settings
var yamlSettings = ConfigYamlHelper.LoadSettingsYaml();

// build a dictionary that allows env vars to override file values
// Order of precedence (final IConfiguration): appsettings.json < yaml file < environment variables
builder.Configuration.AddInMemoryCollection(yamlSettings);

// Optionally: log a warning if secret is default-like (not necessary but useful)
var secret = builder.Configuration["InviteSecret"];
if (string.IsNullOrEmpty(secret))
{
    // fallback generate (shouldn't happen because EnsureSettingsFileExists created one)
    secret = ConfigYamlHelper.GenerateSecret();
}


var app = builder.Build();

// Crée la DB si elle n'existe pas et applique les migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MyDbContext>();
    DbInitializer.EnsureDatabaseReady(db);

    if (!db.Users.Any(u => u.Username == "admin"))
    {
        var admin = new User
        {
            Username = "admin",
            Role = "Admin",
            StorageQuotaBytes = 10L * 1024 * 1024 * 1024, // 10GB
            Active = true
        };
        var hasher = new PasswordHasher<User>();
        admin.PasswordHash = hasher.HashPassword(admin, "password");
        db.Users.Add(admin);
        db.SaveChanges();
    }
}


app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
                       Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
});


app.UseRouting();
app.UseCors("AllowReactApp");
app.UseSession();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers(); // tes /api/*

    // <-- TOUT le reste redirigé vers React index.html
    endpoints.MapFallbackToFile("index.html");
});

app.Run();
