using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

internal class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var projectRoot = UserFolderService.FindProjectRoot();
        var userRootPath = Path.Combine(projectRoot, "users");
        Directory.CreateDirectory(userRootPath);

        // Add services to the container.

        builder.Services.AddControllers();
        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        builder.Services.AddSingleton(new UserFolderService(userRootPath));

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

        // Configurer la limite des fichiers uploadés
        builder.Services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = 1073741824; // 1 GB en bytes
        });

        // Configurer Kestrel également (sécurisé côté serveur)
        builder.WebHost.ConfigureKestrel(serverOptions =>
        {
            serverOptions.Limits.MaxRequestBodySize = 1073741824; // 1 GB
        });

        builder.Services.AddHostedService<PinCleanupService>();

        var app = builder.Build();

        // Crée la DB si elle n'existe pas et applique les migrations
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<MyDbContext>();

            db.Database.EnsureCreated();

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

            FileTypeInitializer.EnsureFileTypesExist(db);
            FileExtensionInitializer.EnsureFileExtensionsExist(db);

            // --- Synchronisation des dossiers utilisateurs ---
            var users = db.Users.ToList();
            var userFolderService = new UserFolderService(userRootPath);
            userFolderService.SyncUserFolders(users);
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


        app.Use(async (context, next) =>
        {
            try
            {
                await next.Invoke();
            }
            catch (BadHttpRequestException ex) when (ex.Message.Contains("Request body too large"))
            {
                context.Response.StatusCode = 413; // Payload Too Large
                await context.Response.WriteAsJsonAsync(new
                {
                    message = "Le fichier est trop volumineux. Limite actuelle: 1GB."
                });
            }
        });


        app.MapControllers();

        Action<IEndpointRouteBuilder> configure = endpoints =>
        {
            endpoints.MapControllers();
            const string FilePath = "index.html";
            endpoints.MapFallbackToFile(FilePath);
        };
        app.UseEndpoints(configure);

        app.Run();
    }
}