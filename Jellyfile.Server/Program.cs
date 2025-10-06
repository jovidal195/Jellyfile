using Jellyfile.Server;
using Jellyfile.Server.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Ajouter un cache en mémoire pour stocker la session
builder.Services.AddDistributedMemoryCache();

// Configurer la session
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(60); // expire après 60 min d'inactivité
    options.Cookie.HttpOnly = true; // pas accessible depuis JS (sécurité) - évite les attaques XSS
    options.Cookie.IsEssential = true; // obligatoire pour le fonctionnement
    options.Cookie.SecurePolicy = CookieSecurePolicy.None;
});

// Ajouter le DbContext pour EF Core
builder.Services.AddDbContext<Jellyfile.Server.MyDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))
);


var app = builder.Build();

// Crée la DB si elle n'existe pas et applique les migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MyDbContext>();
    db.Database.EnsureCreated(); // crée la DB si elle n'existe pas

    if (!db.Users.Any(u => u.Username == "admin"))
    {
        db.Users.Add(new User
        {
            Username = "admin",
            Password = "password" // mot de passe en clair pour l’instant
        });
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

app.UseSession();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
