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

            var fileName = $"{Guid.NewGuid()}_{file.FileName}";
            var fullPath = Path.Combine(userRootPath, dbUser.Username, fileName);

            var poids_fichier = file.Length;

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
                        poids_fichier = fileInfo.Length;
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
                SizeBytes = poids_fichier,
                FileTypeId = fileTypeId,
                CreatedAt = DateTime.UtcNow,
                CreatedById = dbUser.Id,
                StorageNode = "local",
                Hash = hash
            };

            _db.Files.Add(dbFile);
            await _db.SaveChangesAsync();

            var owner = new FileOwner
            {
                FileId = dbFile.Id,
                UserId = dbUser.Id,
                Permission = PermissionLevel.Admin // par défaut le créateur est admin
            };

            // Ajoute le FileOwner au DbContext
            _db.FileOwners.Add(owner);
            dbUser.StorageUsedBytes += poids_fichier;
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
                dbFile.CreatedAt
            });

        }
    }
}
