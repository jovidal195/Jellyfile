using Jellyfile.Server.Models;
using Jellyfile.Server.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Jellyfile.Server.Controllers
{
    [ApiController]
    [Route("api/folders")]
    public class FoldersController : ControllerBase
    {
        private readonly MyDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly FileServingService _fileService;
        private readonly IConfiguration _config;
        private readonly ILogger<FoldersController> _logger;

        public FoldersController(MyDbContext db, IWebHostEnvironment env, FileServingService fileService, IConfiguration config, ILogger<FoldersController> logger)
        {
            _db = db;
            _env = env;
            _fileService = fileService;
            _config = config;
            _logger = logger;
        }

        // ---------------------------------------
        // Création de dossier
        // ---------------------------------------

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateFolderRequest request)
        {
            // Vérifie que l'utilisateur est loggé
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Unauthorized(new { message = "Pas de session" });

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Nom du dossier requis" });

            var folder = new Folder
            {
                Name = request.Name,
                Uuid = Guid.NewGuid().ToString()
            };

            if (!string.IsNullOrEmpty(request.ParentFolderUuid))
            {
                // Récupère le parent par UUID
                var parent = await _db.Folders
                    .FirstOrDefaultAsync(f => f.Uuid == request.ParentFolderUuid);

                if (parent == null)
                    return BadRequest(new { message = "Dossier parent introuvable" });

                folder.ParentFolderId = parent.Id;
                folder.OwnerId = parent.OwnerId; // hérite du parent
            }
            else
            {
                // Root folder pour l'utilisateur courant
                folder.OwnerId = sessionUserId.Value;
                folder.ParentFolderId = null;
            }

            _db.Folders.Add(folder);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                folder.Uuid,
                folder.Name
            });
        }

        public class CreateFolderRequest
        {
            public string Name { get; set; }
            public string ParentFolderUuid { get; set; } // uuid du parent, null si root
        }

        // ---------------------------------------
        // Suppression par promotions
        // ---------------------------------------

        [HttpDelete("promote/{uuid}")]
        public async Task<IActionResult> DeleteAndPromote(string uuid)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Unauthorized(new { message = "Pas de session" });

            // Récupère le folder + owner
            var folder = await _db.Folders
                .Include(f => f.SubFolders)
                .Include(f => f.Files)
                .FirstOrDefaultAsync(f => f.Uuid == uuid);

            if (folder == null)
                return NotFound(new { message = "Dossier introuvable" });

            // Récupère l'utilisateur courant pour vérifier l'admin
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == sessionUserId.Value);
            if (user == null)
                return Unauthorized(new { message = "Utilisateur introuvable" });

            // Vérifie que c'est le créateur ou un admin
            if (folder.OwnerId != sessionUserId.Value && user.Role != "Admin")
                return StatusCode(403, new { message = "Vous n'avez pas la permission de supprimer ce dossier" });


            if (folder.ParentFolderId == null)
                return BadRequest(new { message = "Impossible de promouvoir les enfants d'un dossier root" });

            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                // Remonter les sous-dossiers
                var childrenFolders = await _db.Folders
                    .Where(f => f.ParentFolderId == folder.Id)
                    .ToListAsync();

                foreach (var child in childrenFolders)
                {
                    child.ParentFolderId = folder.ParentFolderId;
                    child.OwnerId = folder.OwnerId;
                    _db.Folders.Update(child);
                }

                // Remonter les fichiers
                var files = await _db.Files
                    .Where(f => f.ParentFolderId == folder.Id)
                    .ToListAsync();

                foreach (var file in files)
                {
                    file.ParentFolderId = folder.ParentFolderId;
                    _db.Files.Update(file);
                }

                _db.Folders.Remove(folder);

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Dossier supprimé et enfants promus" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Erreur interne", detail = ex.Message });
            }
        }


        // ---------------------------------------
        // Suppression récursive
        // ---------------------------------------

        [HttpDelete("delete-recursive/{uuid}")]
        public async Task<IActionResult> DeleteRecursive(string uuid)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Unauthorized();

            try
            {
                await DeleteFolderRecursiveAsync(uuid, sessionUserId.Value);
                return Ok(new { message = "Suppression complète effectuée" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }



        private async Task DeleteFolderRecursiveAsync(string folderUuid, int sessionUserId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == sessionUserId);
            if (user == null)
                throw new UnauthorizedAccessException();

            var folder = await _db.Folders.FirstOrDefaultAsync(f => f.Uuid == folderUuid);
            if (folder == null)
                throw new InvalidOperationException("Dossier introuvable");

            if (folder.ParentFolderId == null)
                throw new InvalidOperationException("Impossible de supprimer un dossier racine");

            var isOwner = folder.OwnerId == user.Id;
            var isAdmin = user.Role == "Admin";

            if (!isOwner && !isAdmin)
                throw new UnauthorizedAccessException("Permission refusée");

            // 1. récupérer tous les dossiers descendants
            var allFolders = await GetAllDescendantFolders(folder);

            var folderIds = allFolders.Select(f => f.Id).ToList();

            // 2. récupérer tous les fichiers liés
            var files = await _db.Files
                .Where(f => f.ParentFolderId != null && folderIds.Contains(f.ParentFolderId.Value))
                .ToListAsync();

            // 3. suppression physique des fichiers
            var projectRoot = UserFolderService.FindProjectRoot();
            //_logger.LogInformation("projectRoot = {Root}", projectRoot);
            
            foreach (var file in files)
            {
                var fullPath = Path.Combine(projectRoot, "users", file.Path);
                //_logger.LogInformation("Deleting file {Path}", fullPath);
                if (System.IO.File.Exists(fullPath))
                {
                    try
                    {
                        System.IO.File.Delete(fullPath);
                    }
                    catch
                    {
                        // volontairement silencieux, la DB doit rester cohérente
                    }
                }
            }

            // 4. suppression DB (cascade sur Files + FileOwners)
            if (files.Any())
            {
                _db.Files.RemoveRange(files);
            }
            _db.Folders.RemoveRange(allFolders);
            await _db.SaveChangesAsync();

            // 5. recalcul du quota
            await RecalculateStorageUsedBytes(user.Id);
        }

        private async Task<List<Folder>> GetAllDescendantFolders(Folder root)
        {
            var result = new List<Folder> { root };
            var queue = new Queue<Folder>();
            queue.Enqueue(root);

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();

                var children = await _db.Folders
                    .Where(f => f.ParentFolderId == current.Id)
                    .ToListAsync();

                foreach (var child in children)
                {
                    result.Add(child);
                    queue.Enqueue(child);
                }
            }

            return result;
        }

        private async Task RecalculateStorageUsedBytes(int userId)
        {
            var files = await _db.FileOwners
                .Where(fo => fo.UserId == userId)
                .Select(fo => fo.File)
                .Where(f => f.IsActive)
                .Distinct()
                .ToListAsync();

            var total = files.Sum(f => f.SizeBytes);

            var user = await _db.Users.FindAsync(userId);
            if (user != null)
            {
                user.StorageUsedBytes = total;
                await _db.SaveChangesAsync();
            }
        }

    };
}
