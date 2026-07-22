using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfile.Server.Controllers
{
    [ApiController]
    [Route("api/system")]
    public class SystemController : Controller
    {
        private bool IsSecurePassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                return false;

            if (password.Length < 12)
                return false;

            if (!password.Any(char.IsUpper))
                return false;

            if (!password.Any(char.IsLower))
                return false;

            if (!password.Any(char.IsDigit))
                return false;

            if (!password.Any(c => !char.IsLetterOrDigit(c)))
                return false;

            return true;
        }

        private readonly MyDbContext _db;
        private readonly PasswordHasher<User> _passwordHasher;
        private readonly UserFolderService _userFolderService;  

        public SystemController(MyDbContext db, UserFolderService userFolderService)
        {
            _db = db;
            _passwordHasher = new PasswordHasher<User>();
            _userFolderService = userFolderService;
        }

        [HttpGet("admin-exists")]
        public IActionResult AdminExists()
        {
            var adminExists = _db.Users.Any(u => u.Role == "Admin");

            return Ok(new
            {
                adminExists
            });
        }


        [HttpPost("create-admin")]
        public IActionResult CreateAdmin([FromBody] CreateAdminRequest request)
        {
            if (_db.Users.Any(u => u.Role == "Admin"))
            {
                return Unauthorized(new
                {
                    message = "Un administrateur existe déjà."
                });
            }


            if (!IsSecurePassword(request.Password))
            {
                return BadRequest(new
                {
                    message = "Le mot de passe ne respecte pas les critères de sécurité."
                });
            }


            using var transaction = _db.Database.BeginTransaction();

            try
            {
                var admin = new User
                {
                    Username = "admin",
                    Role = "Admin",
                    StorageQuotaBytes = 10L * 1024 * 1024 * 1024,
                    Active = true
                };


                admin.PasswordHash = _passwordHasher.HashPassword(
                    admin,
                    request.Password
                );


                _db.Users.Add(admin);
                _db.SaveChanges();


                // Création du dossier physique utilisateur
                _userFolderService.EnsureFolderForUser(admin);


                // Création du dossier logique Jellyfile
                var adminFolder = new Folder
                {
                    Name = "Fichiers admins",
                    OwnerId = admin.Id,
                    Uuid = Guid.NewGuid().ToString(),
                    ParentFolderId = null,
                    SubFolders = new List<Folder>(),
                    Files = new List<Jellyfile.Server.Models.File>()
                };


                _db.Folders.Add(adminFolder);
                _db.SaveChanges();


                transaction.Commit();


                return Ok(new
                {
                    message = "Compte administrateur créé."
                });
            }
            catch (Exception ex)
            {
                transaction.Rollback();

                return StatusCode(500, new
                {
                    message = ex.Message
                });
            }
        }
    }
}