using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Jellyfile.Server.Models;
using Jellyfile.Server.Infrastructure;

namespace Jellyfile.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly MyDbContext _context;

        public ProfileController(MyDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            // Récupère l'utilisateur connecté via la session
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Pas de session" });

            // Cherche l'utilisateur + profil (profil peut être null)
            var user = await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return NotFound(new { message = "Utilisateur introuvable" });

            // Retourne uniquement les infos existantes, profil vide si aucun enregistrement
            var profileData = user.Profile != null ? new
            {
                user.Profile.FirstName,
                user.Profile.LastName,
                user.Profile.Email,
                user.Profile.Phone
            } : null;

            return Ok(new
            {
                user.Username,
                user.Role,
                Profile = profileData
            });
        }

        [HttpPost]
        public async Task<IActionResult> SaveProfile([FromBody] ProfileDto model)
        {
            // vérifie si l'utilisateur est connecté
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Pas de session" });

            // Récupère l'utilisateur et son profil (si existe)
            var user = await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return NotFound(new { message = "Utilisateur introuvable" });

            // Si le profil n'existe pas, on le crée
            if (user.Profile == null)
            {
                user.Profile = new UserProfile
                {
                    FirstName = model.FirstName,
                    LastName = model.LastName,
                    Email = model.Email,
                    Phone = model.Phone
                };

                _context.UserProfiles.Add(user.Profile);
            }
            else
            {
                // Sinon, on met à jour le profil existant
                user.Profile.FirstName = model.FirstName;
                user.Profile.LastName = model.LastName;
                user.Profile.Email = model.Email;
                user.Profile.Phone = model.Phone;

                _context.UserProfiles.Update(user.Profile);
            }

            // Sauvegarde les changements
            await _context.SaveChangesAsync();

            return Ok(new { message = "Profil sauvegardé avec succès." });
        }

    }
}
