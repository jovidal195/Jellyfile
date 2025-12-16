using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic.FileIO;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using System;
using System.Security.Cryptography;
using System.Text.Json;
using DbFile = Jellyfile.Server.Models.File;

namespace Jellyfile.Server.Controllers
{
    [ApiController]
    [Route("api/files")]
    public class FilesController : ControllerBase
    {
        private readonly MyDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly FileServingService _fileService;
        private readonly IConfiguration _config;

        public FilesController(MyDbContext db, IWebHostEnvironment env, FileServingService fileService, IConfiguration config)
        {
            _db = db;
            _env = env;
            _fileService = fileService;
            _config = config;
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
            var isAvatar = false;

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
                        isAvatar = true;
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
                Uuid = fileGuid.ToString(),
                IsAvatar = isAvatar
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
                dbFile.Uuid,
                isAvatar = dbFile.IsAvatar
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
                return Ok(await BuildAdminTree());

            return Ok(await BuildUserTree(user));
        }

        private async Task<object> BuildUserTree(User user)
        {
            var myFiles = await _db.Files
                .Where(f => f.CreatedById == user.Id)
                .Include(f => f.FileType)
                .Include(f => f.Pins)
                .AsNoTracking()
                .ToListAsync();

            var sharedFiles = await _db.FileOwners
                .Where(fo => fo.UserId == user.Id)
                .Include(fo => fo.File)
                    .ThenInclude(f => f.FileType)
                .Include(fo => fo.File)
                    .ThenInclude(f => f.CreatedBy)
                .AsNoTracking()
                .Select(fo => fo.File)
                .Where(f => f.CreatedById != user.Id)
                .ToListAsync();

            var tree = new List<object>();

            var myRoot = BuildFolder("Mes fichiers", myFiles);
            if (myRoot != null)
                tree.Add(myRoot);

            if (sharedFiles.Any())
            {
                var sharedRoot = BuildFolder("Shared", sharedFiles, includeOwner: true);
                if (sharedRoot != null)
                    tree.Add(sharedRoot);
            }

            return tree;
        }

        private async Task<object> BuildAdminTree()
        {
            var users = await _db.Users.AsNoTracking().ToListAsync();

            var files = await _db.Files
                .Include(f => f.FileType)
                .Include(f => f.Pins)
                .Include(f => f.CreatedBy)
                .AsNoTracking()
                .ToListAsync();

            return users
                .Select(u => BuildFolder(
                    u.Username,
                    files.Where(f => f.CreatedById == u.Id)
                ))
                .Where(folder => folder != null)
                .ToList();
        }

        private object? BuildFolder(
            string name,
            IEnumerable<Jellyfile.Server.Models.File> files,
            bool includeOwner = false
        )
        {
            var fileList = files.ToList();
            if (!fileList.Any())
                return null;

            // fichiers normaux et avatars
            var regularFiles = fileList.Where(f => !f.IsAvatar).ToList();
            var avatarFiles = fileList.Where(f => f.IsAvatar).ToList();

            // helper: node "file"
            object FileNode(Jellyfile.Server.Models.File f) => new
            {
                Type = "file",
                IsFolder = false,
                isAvatar = f.IsAvatar,
                Name = f.Name,
                Uuid = f.Uuid,
                //Path = f.Path,
                SizeBytes = f.SizeBytes,
                CreatedAt = f.CreatedAt,
                FileTypeName = f.FileType.Name,
                Owner = includeOwner ? f.CreatedBy.Username : null,
                Pins = f.Pins
                    .Where(p => !p.ExpiresAt.HasValue || p.ExpiresAt > DateTime.UtcNow)
                    .Select(p => {
                        string accessKey;
                        try { accessKey = ComputeAccessKey(f.Id, p.Pin); }
                        catch { accessKey = null; }

                        return new
                        {
                            p.Pin,
                            p.ExpiresAt,
                            p.Note,
                            accessKey,
                            linkPath = accessKey != null ? $"/pin/{f.Uuid}/{accessKey}/{f.Name}" : null,
                            p.MaxDevices
                        };
                    })
            };

            // construire la liste de nodes (fichiers normaux)
            var nodes = regularFiles.Select(f => (object)FileNode(f)).ToList();

            // si on a des avatars, crée un vrai dossier node contenant les avatars
            if (avatarFiles.Any())
            {
                var avatarChildNodes = avatarFiles.Select(f => (object)FileNode(f)).ToList();

                var avatarFolderNode = new
                {
                    Type = "folder",
                    IsFolder = true,
                    Name = "Avatars",
                    Files = avatarChildNodes,
                    Count = avatarChildNodes.Count
                };

                // Insère le dossier "Avatars" à la fin (ou change l'index si tu veux qu'il soit avant)
                nodes.Add(avatarFolderNode);
            }

            return new
            {
                Name = name,
                Files = nodes
            };
        }

        [HttpPost("setAvatar/{uuid}/{fileName}")]
        public async Task<IActionResult> SetAvatar(string uuid, string fileName)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Unauthorized(new { message = "Pas de session" });

            var dbUser = await _db.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == sessionUserId);

            if (dbUser == null)
                return NotFound(new { message = "Utilisateur introuvable" });

            // Trouver le fichier par UUID et nom
            var dbFile = await _db.Files
                .FirstOrDefaultAsync(f => f.Uuid == uuid && f.Name == fileName);

            if (dbFile == null)
                return NotFound(new { message = "Fichier introuvable" });

            dbUser.Profile.Avatar = dbFile.Id;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Avatar mis à jour" });
        }

        [HttpGet("{uuid}/{fileName}")]
        [HttpHead("{uuid}/{fileName}")]
        public async Task<IActionResult> GetFile(string uuid, string fileName, [FromQuery] string? pin, [FromQuery] string? accessToken, [FromQuery] string? fp)
        {
            var dbFile = await _db.Files
                .Include(f => f.Owners)
                  .ThenInclude(fo => fo.User)
                .Include(f => f.Pins)
                  .ThenInclude(p => p.FailedFingerprints)
                .FirstOrDefaultAsync(f => f.Uuid == uuid && f.Name == fileName);

            if (dbFile == null)
                return NotFound(new { message = "Fichier introuvable" });

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
            bool isPublic = dbFile.Owners
                .Any(fo => fo.Permission == PermissionLevel.Public &&
                           (fo.PermissionExpiresAt == null || fo.PermissionExpiresAt > DateTime.UtcNow));

            // Vérification du PIN et fingerprint
            FilePin? filePin = null;
            if (!string.IsNullOrEmpty(pin) || !string.IsNullOrEmpty(accessToken))
                filePin = await ValidateFilePin(dbFile, pin, accessToken, fp, true);

            if (!isCreator && !hasAuthAccess && !isPublic && filePin == null && !isAdmin)
            {
                if (userId == null && dbFile.Owners.Any(fo => fo.Permission != PermissionLevel.Public))
                    return Unauthorized(new { message = "Pas de session" });

                return Forbid();
            }

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
                ExpiresAt = dto.ExpiresAt,
                MaxDevices = dto.MaxDevices,
                FailedDevices = 0
            };

            _db.FilePins.Add(filePin);
            await _db.SaveChangesAsync();

            var accessKey = ComputeAccessKey(file.Id, dto.Pin);
            var linkPath = $"/pin/{file.Uuid}/{accessKey}/{file.Name}";

            return Ok(new
            {
                pin = dto.Pin,
                note = dto.Note,
                expiresAt = dto.ExpiresAt,
                accessKey,
                linkPath,
                dto.MaxDevices
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
            filePin.MaxDevices = dto.MaxDevices;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                pin = filePin.Pin,
                note = filePin.Note,
                expiresAt = filePin.ExpiresAt,
                maxDevices = filePin.MaxDevices
            });
        }

    [HttpPost("pin/validate/{uuid}/{fileName}")]
    public async Task<IActionResult> ValidatePin(string uuid, string fileName, [FromBody] ValidatePinDto dto)
    {
        var pin = dto.Pin;
        var accessToken = dto.AccessToken;
        var fp = dto.Fingerprint;

        var dbFile = await _db.Files
            .Include(f => f.FileType)
            .Include(f => f.Pins)
                .ThenInclude(p => p.FailedFingerprints)
            .Include(f => f.CreatedBy)
            .Include(f => f.Owners)
            .FirstOrDefaultAsync(f => f.Uuid == uuid && f.Name == fileName);

        var filePin = await ValidateFilePin(dbFile, dto.Pin, dto.AccessToken, dto.Fingerprint, false);
        if (filePin == null)
            return StatusCode(403, new { message = "PIN invalide ou accès bloqué" });

        if (dbFile == null)
            return StatusCode(403, new { message = "PIN invalide" });

        var expectedKey = ComputeAccessKey(dbFile.Id, pin);
        if (accessToken != expectedKey)
            return StatusCode(403, new { message = "PIN invalide" });

        var userId = HttpContext.Session.GetInt32("UserId");

        var fileObj = new
        {
            dbFile.Name,
            dbFile.Uuid,
            dbFile.Path,
            dbFile.SizeBytes,
            dbFile.CreatedAt,
            FileTypeName = dbFile.FileType.Name,
            Owner = dbFile.CreatedBy.Username
        };

        if (userId != null)
        {
            var access = dbFile.Owners.Any(fo =>
                fo.UserId == userId.Value &&
                fo.Permission == PermissionLevel.AuthUser &&
                (fo.PermissionExpiresAt == null || fo.PermissionExpiresAt > DateTime.UtcNow));

            if (!access)
            {
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

        return Ok(new { authenticated = false, file = fileObj });
    }


        private string ComputeAccessKey(int fileId, string pin)
        {
            var secret = _config["InviteSecret"];
            var raw = $"{fileId}:{pin}:{secret}";
            using var sha = System.Security.Cryptography.SHA256.Create();
            var bytes = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(raw));
            return Convert.ToBase64String(bytes)
                .Replace("+", "")
                .Replace("/", "")
                .Replace("=", "")
                .Substring(0, 16); // 16 caractères, suffisant
        }

        private async Task<FilePin?> ValidateFilePin(DbFile dbFile, string? pin, string? accessToken, string? fingerprint, bool countEveryFailure)
        {
            const int MAX_FP_FAILS = 7;

            if (dbFile == null)
                return null;

            // Récupérer le PIN correspondant à l'accessToken
            var activePins = dbFile.Pins.Where(p => p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow);
            var matchingPin = activePins.FirstOrDefault(p => ComputeAccessKey(dbFile.Id, p.Pin) == accessToken);

            if (matchingPin == null)
                return null;

            Console.WriteLine("matchingPin");
            Console.WriteLine(matchingPin);

            Console.WriteLine(matchingPin.FailedDevices);
            Console.WriteLine(matchingPin.MaxDevices);

            // Blocage global si trop de devices échoués
            if (matchingPin.FailedDevices >= matchingPin.MaxDevices)
                return null;

            // Fingerprint obligatoire
            if (string.IsNullOrWhiteSpace(fingerprint))
            {
                matchingPin.FailedDevices = matchingPin.MaxDevices;
                await _db.SaveChangesAsync();
                return null;
            }

            var failedFp = matchingPin.FailedFingerprints.FirstOrDefault(f => f.Fingerprint == fingerprint);
            if (failedFp != null && failedFp.FailCount >= MAX_FP_FAILS)
                return null;
            
            Console.WriteLine("test");

            // PIN invalide (comparé à celui fourni)
            if (pin != matchingPin.Pin)
            {
                if (failedFp == null)
                {
                    matchingPin.FailedFingerprints.Add(new FailedFingerprint
                    {
                        Fingerprint = fingerprint,
                        FailCount = 1
                    });

                    matchingPin.FailedDevices++;
                }
                else
                {
                    if (failedFp.FailCount == 0)
                    {
                        failedFp.FailCount = 1;
                        matchingPin.FailedDevices++;
                    }
                    else
                    {
                        failedFp.FailCount++;
                        if (countEveryFailure)
                        {
                            matchingPin.FailedDevices++;
                        }
                    }
                }

                await _db.SaveChangesAsync();
                return null;
            }


            // PIN valide -> reset fingerprint
            if (failedFp != null && failedFp.FailCount > 0)
            {
                failedFp.FailCount = 0;
                if (matchingPin.FailedDevices > 0)
                    matchingPin.FailedDevices--;
                await _db.SaveChangesAsync();
            }

            return matchingPin;
        }

    }
}
