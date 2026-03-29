using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using File = System.IO.File;

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

        builder.Services.AddScoped<UserStorageService>();

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
        builder.Services.AddSingleton<FileServingService>();

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

                // --- CRÉER LE FOLDER ROOT POUR ADMIN ---
                var adminRootFolder = new Folder
                {
                    Name = "Fichiers admins",
                    OwnerId = admin.Id,
                    Uuid = Guid.NewGuid().ToString(),
                    ParentFolderId = null, // root
                    SubFolders = new List<Folder>(),
                    Files = new List<Jellyfile.Server.Models.File>()
                };
                db.Folders.Add(adminRootFolder);
                db.SaveChanges();
            }

            if (!db.AppSettings.Any())
            {
                db.AppSettings.Add(new AppSettings()); // toutes les valeurs par défaut du modèle sont utilisées
                db.SaveChanges();
            }

            FileTypeInitializer.EnsureFileTypesExist(db);
            FileExtensionInitializer.EnsureFileExtensionsExist(db);

            // --- Synchronisation des dossiers utilisateurs ---
            var users = db.Users.ToList();
            var userFolderService = new UserFolderService(userRootPath);
            userFolderService.SyncUserFolders(users);

            var settings = db.AppSettings.First();
            var css = $@"
            :root {{
                --app-name: {settings.ApplicationName};
            }}

            :root[data-theme=""light""] {{
                --login-bg: {settings.Light_LoginBg};
                --login-text: {settings.Light_LoginText};
                --login-input-bg: {settings.Light_LoginInputBg};
                --login-input-text: {settings.Light_LoginInputText};
                --login-button-bg: {settings.Light_LoginButtonBg};
                --login-button-text: {settings.Light_LoginButtonText};
                --login-button-hover: {settings.Light_LoginButtonHover};
                --interface-bg: {settings.Light_InterfaceBg};
                --interface-leftbox-bg: {settings.Light_InterfaceLeftboxBg};
                --interface-text: {settings.Light_InterfaceText};
            }}

            :root[data-theme=""dark""] {{
                --login-bg: {settings.Dark_LoginBg};
                --login-text: {settings.Dark_LoginText};
                --login-input-bg: {settings.Dark_LoginInputBg};
                --login-input-text: {settings.Dark_LoginInputText};
                --login-button-bg: {settings.Dark_LoginButtonBg};
                --login-button-text: {settings.Dark_LoginButtonText};
                --login-button-hover: {settings.Dark_LoginButtonHover};
                --interface-bg: {settings.Dark_InterfaceBg};
                --interface-leftbox-bg: {settings.Dark_InterfaceLeftboxBg};
                --interface-text: {settings.Dark_InterfaceText};
            }}
            ";

            // sauvegarde dans le dossier public React pour qu'il soit chargé par le navigateur
            var cssPath = Path.Combine(
                builder.Environment.ContentRootPath,
                "..",
                "Jellyfile.Client",
                "src",
                "theme.css"
            );
            var directory = Path.GetDirectoryName(cssPath);
            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory!);
            }
            File.WriteAllText(cssPath, css);
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

        app.Use(async (context, next) =>
        {
            if (context.Request.Path.StartsWithSegments("/api/files"))
            {
                context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
                context.Response.Headers["Pragma"] = "no-cache";
                context.Response.Headers["Expires"] = "0";
                context.Response.Headers["Vary"] = "Cookie"; // important pour session
            }

            await next.Invoke(); // appel normal du pipeline
        });

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