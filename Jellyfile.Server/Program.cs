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

app.UseRouting();
app.UseCors("AllowReactApp");
app.UseSession();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
