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
            object profileData = null;
            if (user.Profile != null)
            {
                profileData = user.Profile
                    .GetType()
                    .GetProperties()
                    .Where(p => p.PropertyType.IsPrimitive
                             || p.PropertyType == typeof(string)
                             || p.PropertyType == typeof(DateTime)
                             || p.PropertyType == typeof(decimal)
                             || Nullable.GetUnderlyingType(p.PropertyType) != null)
                    .ToDictionary(p => p.Name, p => p.GetValue(user.Profile));
            }

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

            // Crée le profil s'il n'existe pas
            if (user.Profile == null)
            {
                user.Profile = new UserProfile();
                _context.UserProfiles.Add(user.Profile);
            }

            // Dynamique : parcourt toutes les propriétés du DTO
            foreach (var prop in typeof(ProfileDto).GetProperties())
            {
                var value = prop.GetValue(model);
                var profileProp = user.Profile.GetType().GetProperty(prop.Name);
                if (profileProp != null && profileProp.CanWrite)
                {
                    profileProp.SetValue(user.Profile, value);
                }
            }

            // Sauvegarde les changements
            await _context.SaveChangesAsync();

            return Ok(new { message = "Profil sauvegardé avec succès." });
        }

    }
}
