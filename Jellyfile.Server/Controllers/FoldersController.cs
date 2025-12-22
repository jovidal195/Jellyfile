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

        public FoldersController(MyDbContext db, IWebHostEnvironment env, FileServingService fileService, IConfiguration config)
        {
            _db = db;
            _env = env;
            _fileService = fileService;
            _config = config;
        }

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





    };
}
