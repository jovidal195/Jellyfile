using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

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
        [HttpPost]
        public async Task<IActionResult> SaveProfile([FromBody] ProfileDto model)
        {
            // 1. Récupère le user de session
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Unauthorized(new { message = "Pas de session" });

            var sessionUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == sessionUserId.Value);

            if (sessionUser == null)
                return NotFound(new { message = "Utilisateur de session introuvable" });

            // 2. Détermine le user cible
            int targetUserId = model.UserId ?? sessionUser.Id;

            // 3. Vérifie permissions
            if (targetUserId != sessionUser.Id && sessionUser.Role != "Admin")
                return Forbid("Seul un admin peut modifier un autre utilisateur.");

            // 4. Récupère le user cible avec profil
            var user = await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == targetUserId);

            if (user == null)
                return NotFound(new { message = "Utilisateur introuvable" });

            // 5. Crée le profil si inexistant
            if (user.Profile == null)
            {
                user.Profile = new UserProfile();
                _context.UserProfiles.Add(user.Profile);
            }

            // 6. Parcourt toutes les propriétés du DTO
            foreach (var prop in typeof(ProfileDto).GetProperties())
            {
                var value = prop.GetValue(model);

                if (prop.Name == "UserId") continue;

                if (prop.Name == "StorageQuotaBytes")
                {
                    // Seul admin peut modifier le quota
                    if (sessionUser.Role == "Admin" && value != null)
                    {
                        long quota = (long)value;
                        var allowed = new long[] { 1, 2, 3, 5, 10, 20 }
                                      .Select(g => g * 1024L * 1024L * 1024L);
                        if (!allowed.Contains(quota))
                            return BadRequest(new { message = "Valeur de quota non autorisée." });

                        user.StorageQuotaBytes = quota;
                    }
                    continue;
                }

                // Autres propriétés : update profil
                var profileProp = user.Profile.GetType().GetProperty(prop.Name);
                if (profileProp != null && profileProp.CanWrite)
                {
                    profileProp.SetValue(user.Profile, value);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Profil sauvegardé avec succès." });
        }


    }
}
