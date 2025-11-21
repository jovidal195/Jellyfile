using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Authorization;
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
        private readonly FileServingService _fileService;

        public FilesController(MyDbContext db, IWebHostEnvironment env, FileServingService fileService)
        {
            _db = db;
            _env = env;
            _fileService = fileService;
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

            var fileType = await _db.FileTypes.FindAsync(fileTypeId);

            // =================================================================
            // Validation complète et retour vers le frontend
            // =================================================================
            return Ok(new
            {
                dbFile.Name,
                dbFile.SizeBytes,
                FileTypeName = fileType?.Name,
                dbFile.CreatedAt,
                dbFile.Uuid
            });

        }

        [HttpGet("tree")]
        public async Task<IActionResult> GetFileTree()
        {
            // =================================================================
            // Vérifie que l'utilisateur est authentifié
            // =================================================================

            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Pas de session" });

            var user = await _db.Users.FindAsync(userId.Value);
            if (user == null)
                return Unauthorized(new { message = "Utilisateur introuvable" });

            // =================================================================
            // Construction du tree
            // =================================================================

            if (user.Role == "Admin")
            {
                // Admin : un dossier par utilisateur
                var users = await _db.Users
                    .AsNoTracking()
                    .ToListAsync();

                var files = await _db.Files
                    .Include(f => f.CreatedBy)
                    .Include(f => f.FileType)
                    .Include(f => f.Pins)
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
                            //f.Hash,
                            f.Uuid,
                            f.SizeBytes,
                            f.CreatedAt,
                            FileTypeName = f.FileType.Name,
                            Pins = f.Pins
                                .Where(p => !p.ExpiresAt.HasValue || p.ExpiresAt > DateTime.UtcNow)
                                .Select(p => new {
                                    p.Pin,
                                    p.ExpiresAt,
                                    p.Note
                                })
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
                    .Include(f => f.Pins)
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
                            //f.Hash,
                            f.Uuid,
                            f.Path,
                            f.SizeBytes,
                            f.CreatedAt,
                            FileTypeName = f.FileType.Name,
                            Pins = f.Pins
                                .Where(p => !p.ExpiresAt.HasValue || p.ExpiresAt > DateTime.UtcNow)
                                .Select(p => new {
                                    p.Pin,
                                    p.ExpiresAt,
                                    p.Note
                                })
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
                            //f.Hash,
                            f.Uuid,
                            f.Path,
                            f.SizeBytes,
                            f.CreatedAt,
                            FileTypeName = f.FileType.Name,
                            Owner = f.CreatedBy.Username,
                            Pins = f.Pins
                                .Where(p => !p.ExpiresAt.HasValue || p.ExpiresAt > DateTime.UtcNow)
                                .Select(p => new {
                                    p.Pin,
                                    p.ExpiresAt,
                                    p.Note
                                })
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

            return _fileService.ServeFile(this, fullPath, dbFile.Name);
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

            Response.Headers["X-Content-Type-Options"] = "nosniff";

            return _fileService.ServeFile(this, fullPath, avatarFile.Name);
        }

        [Authorize]
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

        [HttpPost("create/Pin/{uuid}/{fileName}")]
        public async Task<IActionResult> CreatePin(string uuid, string fileName, [FromBody] CreatePinDto dto)
        {
            // =================================================================
            // Vérifie que l'utilisateur est authentifié
            // =================================================================

            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Pas de session" });

            var user = await _db.Users.FindAsync(userId.Value);
            if (user == null)
                return Unauthorized(new { message = "Utilisateur introuvable" });

            // =================================================================
            // Récupère le fichier
            // =================================================================
            var file = await _db.Files
                .Include(f => f.Pins)
                .FirstOrDefaultAsync(f => f.Uuid == uuid && f.Name == fileName);

            if (file == null)
                return NotFound(new { message = "Fichier introuvable" });

            // Optionnel : vérifier que l'utilisateur peut créer un pin sur ce fichier
            if (file.CreatedById != userId.Value)
                return StatusCode(403, new { message = "Pas les droits sur ce fichier" });

            string pinStr = dto.Pin;

            // Vérifie que ce sont uniquement des chiffres
            if (!pinStr.All(char.IsDigit))
            {
                return BadRequest(new { message = "Le PIN doit être un nombre." });
            }

            // Vérifie la longueur du PIN
            if (pinStr.Length < 5 || pinStr.Length > 8)
            {
                return BadRequest(new { message = "Le PIN doit être compris entre 5 et 8 chiffres." });
            }

            // Conversion en int (ok car max 8 chiffres)
            int pinInt = int.Parse(pinStr);

            bool pinExists = file.Pins.Any(p => p.Pin == dto.Pin);
            if (pinExists)
            {
                return Conflict(new { message = "Ce PIN existe déjà pour ce fichier." });
            }

            // =================================================================
            // Créer un PIN
            // =================================================================
            var filePin = new FilePin
            {
                FileId = file.Id,
                Pin = dto.Pin,
                Note = dto.Note ?? $"Créé par {user.Username}",  // prend la note si fournie
                ExpiresAt = dto.ExpiresAt
            };

            _db.FilePins.Add(filePin);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                pin = dto.Pin,
                note = dto.Note,
                expiresAt = dto.ExpiresAt
            });
        }

        [HttpDelete("delete/Pin/{uuid}/{fileName}/{pin}")]
        public async Task<IActionResult> DeletePin(string uuid, string fileName, int pin)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Pas de session" });

            var file = await _db.Files.Include(f => f.Pins)
                                      .FirstOrDefaultAsync(f => f.Uuid == uuid && f.Name == fileName);
            if (file == null) return NotFound();

            if (file.CreatedById != userId.Value)
                return StatusCode(403, new { message = "Pas les droits sur ce fichier" });

            var filePin = file.Pins.FirstOrDefault(p => int.TryParse(p.Pin, out var val) && val == pin);
            if (filePin == null) return NotFound();

            _db.FilePins.Remove(filePin);
            await _db.SaveChangesAsync();

            return Ok();
        }

        [HttpPut("update/Pin/{uuid}/{fileName}/{pin}")]
        public async Task<IActionResult> UpdatePin(string uuid, string fileName, int pin, [FromBody] UpdatePinDto dto)
        {
            // Vérifie que l'utilisateur est authentifié
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Pas de session" });

            // Récupère le fichier et les pins
            var file = await _db.Files
                .Include(f => f.Pins)
                .FirstOrDefaultAsync(f => f.Uuid == uuid && f.Name == fileName);

            if (file == null)
                return NotFound(new { message = "Fichier introuvable" });

            if (file.CreatedById != userId.Value)
                return StatusCode(403, new { message = "Pas les droits sur ce fichier" });

            var filePin = file.Pins.FirstOrDefault(p => int.TryParse(p.Pin, out var val) && val == pin);
            if (filePin == null)
                return NotFound(new { message = "PIN introuvable" });

            // Met à jour uniquement les champs autorisés
            filePin.Note = dto.Note ?? filePin.Note;
            filePin.ExpiresAt = dto.ExpiresAt;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                pin = filePin.Pin,
                note = filePin.Note,
                expiresAt = filePin.ExpiresAt
            });
        }

        [HttpPost("pin/validate/{uuid}/{fileName}")]
        public async Task<IActionResult> ValidatePin(string uuid, string fileName, [FromBody] ValidatePinDto dto)
        {
            var dbFile = await _db.Files
                .Include(f => f.FileType)
                .Include(f => f.Pins)
                .Include(f => f.CreatedBy)
                .Include(f => f.Owners)
                .FirstOrDefaultAsync(f => f.Uuid == uuid && f.Name == fileName);

            if (dbFile == null)
                return StatusCode(403, new { message = "PIN invalide" });

            var filePin = dbFile.Pins
                .FirstOrDefault(p => p.Pin == dto.Pin &&
                                     (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow));

            if (filePin == null)
                return StatusCode(403, new { message = "PIN invalide" });

            var userId = HttpContext.Session.GetInt32("UserId");

            // ==============================
            // Cas : utilisateur authentifié
            // ==============================

            var fileObj = new
            {
                dbFile.Name,
                dbFile.Uuid,
                dbFile.Path,
                dbFile.SizeBytes,
                dbFile.CreatedAt,
                FileTypeName = dbFile.FileType.Name,
                Owner = dbFile.CreatedBy.Username,
                Pins = dbFile.Pins
                    .Where(p => !p.ExpiresAt.HasValue || p.ExpiresAt > DateTime.UtcNow)
                    .Select(p => new {
                        p.Pin,
                        p.ExpiresAt,
                        p.Note
                    })
            };

            if (userId != null)
            {
                var access = dbFile.Owners
                    .Any(fo => fo.UserId == userId.Value &&
                               fo.Permission == PermissionLevel.AuthUser &&
                               (fo.PermissionExpiresAt == null || fo.PermissionExpiresAt > DateTime.UtcNow));

                if (!access)
                {
                    // Ajoute l’accès AuthUser
                    _db.FileOwners.Add(new FileOwner
                    {
                        UserId = userId.Value,
                        Permission = PermissionLevel.AuthUser,
                        FileId = dbFile.Id
                    });

                    await _db.SaveChangesAsync();
                }

                return Ok(new { authenticated = true, file = fileObj });
            }

            // ==================================
            // Cas : utilisateur non authentifié
            // ==================================

            return Ok(new { authenticated = false, file = fileObj });
        }


    }
}
