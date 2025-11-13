using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic.FileIO;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using System.Security.Cryptography;
using System.Text.Json;

namespace Jellyfile.Server.Controllers
{
    [ApiController]
    [Route("api/files")]
    public class FilesController : ControllerBase
    {
        private readonly MyDbContext _db;
        private readonly IWebHostEnvironment _env;

        public FilesController(MyDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile([FromForm] IFormFile file, [FromForm] string user, [FromForm] string? compress)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Aucun fichier reçu." });

            if (string.IsNullOrEmpty(user))
                return BadRequest(new { message = "Aucun utilisateur envoyé." });

            // =================================================================
            // Vérification de la session et cohérence avec l'utilisateur envoyé
            // =================================================================

            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Unauthorized(new { message = "Pas de session" });

            string sentUsername;
            try
            {
                using var doc = JsonDocument.Parse(user);
                sentUsername = doc.RootElement.GetProperty("username").GetString();
            }
            catch
            {
                return BadRequest(new { message = "Format de l'utilisateur invalide." });
            }

            if (string.IsNullOrEmpty(sentUsername))
                return BadRequest(new { message = "Le username est vide." });

            var dbUser = await _db.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == sessionUserId);

            if (dbUser == null)
                return NotFound("Utilisateur introuvable.");

            if (!string.Equals(dbUser.Username, sentUsername, StringComparison.OrdinalIgnoreCase))
                return Unauthorized("Le username ne correspond pas à la session.");

            if (dbUser.StorageUsedBytes + file.Length > dbUser.StorageQuotaBytes)
                return BadRequest(new { message = "Quota de stockage dépassé. Impossible de téléverser ce fichier." });

            if (dbUser.Profile == null)
            {
                dbUser.Profile = new UserProfile();
                _db.UserProfiles.Add(dbUser.Profile);
            }


            // =================================================================
            // trouve le dossier racine et le créer s'il n'existe pas
            // =================================================================

            var projectRoot = UserFolderService.FindProjectRoot();
            var userRootPath = Path.Combine(projectRoot, "users");
            Directory.CreateDirectory(userRootPath);

            // =================================================================
            // Analyse du type de fichier (extension) et création complète de l’entrée
            // =================================================================

            var extension = Path.GetExtension(file.FileName)?.TrimStart('.').ToLower();


            // Cherche le FileExtension correspondant
            var fileExt = await _db.FileExtensions
                .Include(fe => fe.FileType)
                .FirstOrDefaultAsync(fe => fe.Extension == extension);

            // Si on trouve pas, fallback sur "Autre"
            var fileTypeId = fileExt?.FileTypeId
                 ?? (await _db.FileTypes.FirstAsync(ft => ft.Name == "Autre")).Id;


            string hash;
            using (var sha256 = SHA256.Create())
            using (var stream = file.OpenReadStream())
            {
                var hashBytes = sha256.ComputeHash(stream);
                hash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
            }

            var fileGuid = Guid.NewGuid();
            var fileName = $"{fileGuid}_{file.FileName}";
            var fullPath = Path.Combine(userRootPath, dbUser.Username, fileName);

            var poidsFichier = file.Length;

            var permissionsLevel = PermissionLevel.AuthUser;

            if (!string.IsNullOrEmpty(compress))
            {
                switch (compress.ToLower())
                {
                    case "avatar":
                        // Exemple : réduire la taille, convertir en JPG 150x150
                        using (var image = SixLabors.ImageSharp.Image.Load(file.OpenReadStream()))
                        {
                            image.Mutate(x => x.Resize(150, 150));
                            await image.SaveAsJpegAsync(fullPath, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder
                            {
                                Quality = 80
                            });
                        }

                        var fileInfo = new FileInfo(fullPath);
                        poidsFichier = fileInfo.Length;
                        permissionsLevel = PermissionLevel.Public;
                        break;

                    // Ajouter d'autres cas de compression si besoin
                    default:
                        // Pas de compression
                        await using (var stream = new FileStream(fullPath, FileMode.Create))
                            await file.CopyToAsync(stream);
                        break;
                }
            }
            else
            {
                // Pas de compression
                await using (var stream = new FileStream(fullPath, FileMode.Create))
                    await file.CopyToAsync(stream);
            }

            // Création de l’entrée File dans la DB
            var dbFile = new Models.File
            {
                Name = file.FileName,
                Path = Path.Combine(dbUser.Username, fileName),
                SizeBytes = poidsFichier,
                FileTypeId = fileTypeId,
                CreatedAt = DateTime.UtcNow,
                CreatedById = dbUser.Id,
                StorageNode = "local",
                Hash = hash,
                Uuid = fileGuid.ToString()
            };

            _db.Files.Add(dbFile);
            await _db.SaveChangesAsync();

            var owner = new FileOwner
            {
                FileId = dbFile.Id,
                UserId = dbUser.Id,
                Permission = permissionsLevel
            };

            // Ajoute le FileOwner au DbContext
            _db.FileOwners.Add(owner);
            dbUser.StorageUsedBytes += poidsFichier;
            await _db.SaveChangesAsync();

            if (!string.IsNullOrEmpty(compress))
            {
                dbUser.Profile.Avatar = dbFile.Id;
                await _db.SaveChangesAsync();
            }

            // =================================================================
            // Validation complète et retour vers le frontend
            // =================================================================
            return Ok(new
            {
                dbFile.Id,
                dbFile.Name,
                dbFile.Path,
                dbFile.SizeBytes,
                Type = fileTypeId,
                Owner = dbUser.Username,
                dbFile.CreatedAt,
                dbFile.Uuid
            });

        }

        [HttpGet("tree")]
        public async Task<IActionResult> GetFileTree()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Pas de session" });

            var user = await _db.Users.FindAsync(userId.Value);
            if (user == null)
                return Unauthorized(new { message = "Utilisateur introuvable" });

            if (user.Role == "Admin")
            {
                // Admin : un dossier par utilisateur
                var users = await _db.Users
                    .AsNoTracking()
                    .ToListAsync();

                var files = await _db.Files
                    .Include(f => f.CreatedBy)
                    .Include(f => f.FileType)
                    .AsNoTracking()
                    .ToListAsync();

                var tree = users.Select(u => new
                {
                    Name = u.Username,
                    Files = files
                        .Where(f => f.CreatedById == u.Id)
                        .Select(f => new
                        {
                            f.Name,
                            f.Hash,
                            f.Uuid,
                            f.SizeBytes,
                            f.CreatedAt,
                            FileTypeName = f.FileType.Name
                        })
                        .ToList()
                }).ToList();

                return Ok(tree);
            }
            else
            {
                var myFiles = await _db.Files
                    .Where(f => f.CreatedById == userId.Value)
                    .Include(f => f.FileType)
                    .AsNoTracking()
                    .ToListAsync();

                // Fichiers partagés avec lui
                var sharedFiles = await _db.FileOwners
                    .Where(fo => fo.UserId == userId.Value)
                    .Include(fo => fo.File)
                        .ThenInclude(f => f.FileType)   // <-- inclut le FileType
                    .Include(fo => fo.File)
                        .ThenInclude(f => f.CreatedBy) // si tu veux le Owner
                    .AsNoTracking()
                    .Select(fo => fo.File)
                    .Where(f => f.CreatedById != userId.Value)
                    .ToListAsync();

                var tree = new List<object>
                {
                    new
                    {
                        Name = "Mes fichiers",
                        Files = myFiles
                        .Select(f => new {
                            f.Name,
                            f.Hash,
                            f.Uuid,
                            f.Path,
                            f.SizeBytes,
                            f.CreatedAt,
                            FileTypeName = f.FileType.Name
                        }).ToList()
                    },
                };

                if (sharedFiles.Any())
                {
                    tree.Add(new
                    {
                        Name = "Shared",
                        Files = sharedFiles
                        .Select(f => new {
                            f.Name,
                            f.Hash,
                            f.Uuid,
                            f.Path,
                            f.SizeBytes,
                            f.CreatedAt,
                            FileTypeName = f.FileType.Name,
                            Owner = f.CreatedBy.Username
                        }).ToList()
                    });
                }

                return Ok(tree);
            }
        }

        [HttpGet("{uuid}/{fileName}")]
        [HttpHead("{uuid}/{fileName}")]
        public async Task<IActionResult> GetFile(string uuid, string fileName, [FromQuery] string? pin)
        {
            var dbFile = await _db.Files
                .Include(f => f.Owners)
                .ThenInclude(fo => fo.User)
                .Include(f => f.Pins)
                .FirstOrDefaultAsync(f => f.Uuid == uuid && f.Name == fileName);

            if (dbFile == null)
                return NotFound(new { message = "Fichier introuvable" });


            // Vérifier que le Path contient le bon UUID
            if (!dbFile.Path.Contains(uuid))
                return NotFound(new { message = "Fichier introuvable (UUID mismatch)" });

            var userId = HttpContext.Session.GetInt32("UserId");

            User? currentUser = null;

            if (userId != null)
            {
                currentUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
            }

            bool isAdmin = currentUser?.Role == "Admin";

            // --- Vérification du créateur ---
            bool isCreator = userId != null && dbFile.CreatedById == userId.Value;

            // --- Vérification des partages AuthUser ---
            bool hasAuthAccess = userId != null && dbFile.Owners
                .Any(fo => fo.UserId == userId.Value && fo.Permission == PermissionLevel.AuthUser &&
                           (fo.PermissionExpiresAt == null || fo.PermissionExpiresAt > DateTime.UtcNow));

            // --- Vérification du public ---
            bool isPublic = dbFile.Owners
                .Any(fo => fo.Permission == PermissionLevel.Public &&
                           (fo.PermissionExpiresAt == null || fo.PermissionExpiresAt > DateTime.UtcNow));

            // --- Vérification du PIN ---
            FilePin? matchingPin = null;
            if (!string.IsNullOrEmpty(pin))
            {
                matchingPin = dbFile.Pins
                    .FirstOrDefault(fp => fp.Pin == pin && (fp.ExpiresAt == null || fp.ExpiresAt > DateTime.UtcNow));
            }

            // --- Logique finale d'accès ---
            if (!isCreator && !hasAuthAccess && !isPublic && matchingPin == null && !isAdmin)
            {
                if (userId == null && dbFile.Owners.Any(fo => fo.Permission != PermissionLevel.Public))
                    return Unauthorized(new { message = "Pas de session" });

                return Forbid();
            }

            // --- Construire le chemin du fichier ---
            var projectRoot = UserFolderService.FindProjectRoot();
            var fullPath = Path.Combine(projectRoot, "users", dbFile.Path);

            if (!System.IO.File.Exists(fullPath))
                return NotFound(new { message = "Fichier introuvable sur le serveur" });

            // --- Déterminer le content-type ---
            var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
            if (!provider.TryGetContentType(fullPath, out var contentType))
                contentType = "application/octet-stream";

            return PhysicalFile(fullPath, contentType, dbFile.Name);
        }


        [HttpGet("avatar/{username}")]
        public async Task<IActionResult> GetAvatar(string username)
        {
            // Trouve l'utilisateur avec son profil
            var user = await _db.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null || user.Profile == null)
                return NotFound();

            // Avatar FileId dans le profil
            var avatarFileId = user.Profile.Avatar;
            if (avatarFileId == null)
                return NotFound();

            // Récupère le fichier
            var avatarFile = await _db.Files
                .Include(f => f.Owners)
                .FirstOrDefaultAsync(f => f.Id == avatarFileId.Value);

            if (avatarFile == null)
                return NotFound();

            // Vérifie qu'il y a au moins un owner public valide
            bool isPublic = avatarFile.Owners.Any(fo =>
                fo.Permission == PermissionLevel.Public &&
                (fo.PermissionExpiresAt == null || fo.PermissionExpiresAt > DateTime.UtcNow)
            );

            if (!isPublic)
                return NotFound();

            // Chemin complet
            var projectRoot = UserFolderService.FindProjectRoot();
            var fullPath = Path.Combine(projectRoot, "users", avatarFile.Path);

            if (!System.IO.File.Exists(fullPath))
                return NotFound();

            // Content type
            var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
            if (!provider.TryGetContentType(fullPath, out var contentType))
                contentType = "application/octet-stream";

            return PhysicalFile(fullPath, contentType);
        }

        [HttpDelete("{uuid}/{fileName}")]
        public async Task<IActionResult> DeleteFile(string uuid, string fileName, [FromQuery] string? pin)
        {
            var dbFile = await _db.Files
                .Include(f => f.Owners)
                .Include(f => f.Pins)
                .FirstOrDefaultAsync(f => f.Uuid == uuid && f.Name == fileName);

            if (dbFile == null)
                return NotFound(new { message = "Fichier introuvable" });

            // Vérifier que le Path contient le bon UUID
            if (!dbFile.Path.Contains(uuid))
                return NotFound(new { message = "Fichier introuvable (UUID mismatch)" });

            var userId = HttpContext.Session.GetInt32("UserId");
            User? currentUser = null;
            if (userId != null)
                currentUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);

            bool isAdmin = currentUser?.Role == "Admin";
            bool isCreator = userId != null && dbFile.CreatedById == userId.Value;
            bool hasAuthAccess = userId != null && dbFile.Owners
                .Any(fo => fo.UserId == userId.Value && fo.Permission == PermissionLevel.AuthUser &&
                           (fo.PermissionExpiresAt == null || fo.PermissionExpiresAt > DateTime.UtcNow));
            FilePin? matchingPin = null;
            if (!string.IsNullOrEmpty(pin))
            {
                matchingPin = dbFile.Pins
                    .FirstOrDefault(fp => fp.Pin == pin && (fp.ExpiresAt == null || fp.ExpiresAt > DateTime.UtcNow));
            }

            // Vérification finale d’accès
            if (!isCreator && !hasAuthAccess && matchingPin == null && !isAdmin)
            {
                if (userId == null && dbFile.Owners.Any(fo => fo.Permission != PermissionLevel.Public))
                    return Unauthorized(new { message = "Pas de session" });

                return Forbid();
            }

            // --- Supprimer le fichier physique ---
            var projectRoot = UserFolderService.FindProjectRoot();
            var fullPath = Path.Combine(projectRoot, "users", dbFile.Path);

            if (System.IO.File.Exists(fullPath))
            {
                try
                {
                    System.IO.File.Delete(fullPath);
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { message = "Erreur lors de la suppression du fichier sur le serveur", detail = ex.Message });
                }
            }

            var profilesWithAvatar = await _db.UserProfiles
            .Where(p => p.Avatar == dbFile.Id)
            .ToListAsync();

            foreach (var profile in profilesWithAvatar)
            {
                profile.Avatar = null;  // supprime la référence
            }

            // --- Supprimer les dépendances ---
            if (dbFile.Owners.Any())
                _db.FileOwners.RemoveRange(dbFile.Owners);

            if (dbFile.Pins.Any())
                _db.FilePins.RemoveRange(dbFile.Pins);

            // --- Supprimer le fichier de la DB ---
            _db.Files.Remove(dbFile);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Fichier supprimé avec succès" });
        }


    }
}
