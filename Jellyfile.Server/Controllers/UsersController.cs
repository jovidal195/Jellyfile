using Jellyfile.Server.Controllers;
using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Jellyfile.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly MyDbContext _db;
        private readonly UserFolderService _userFolderService;

        public UsersController(IConfiguration config, MyDbContext db, UserFolderService userFolderService)
        {
            _config = config;
            _db = db;
            _userFolderService = userFolderService;
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllUsers()
        {
            // Vérification de session
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Pas de session active" });

            // Vérification rôle (ex: seulement Admin peut voir tous les users)
            var currentUser = await _db.Users.FindAsync(userId.Value);
            if (currentUser == null || currentUser.Role != "Admin")
                return Forbid();

            var users = await _db.Users
                .Include(u => u.Profile) // Load profiles
                .ToListAsync();

            // Récupération sécurisée des users
            var result = users.Select(u => new
            {
                u.Id,
                u.Username,
                u.Role,
                u.Active,
                u.StorageUsedBytes,
                u.StorageQuotaBytes,
                Profile = u.Profile == null ? null : new
                {
                    u.Profile.FirstName,
                    u.Profile.LastName,
                    u.Profile.Email,
                    u.Profile.Gender,
                    u.Profile.Phone
                }
            }).ToList();

            return Ok(result);
        }

        [HttpPut("{id}/active")]
        public async Task<IActionResult> SetUserActive(int id, [FromBody] bool active)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Pas de session active" });

            var currentUser = await _db.Users.FindAsync(userId.Value);
            if (currentUser == null || currentUser.Role != "Admin")
                return Forbid();

            var user = await _db.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            user.Active = active;
            await _db.SaveChangesAsync();

            return Ok(new { user.Id, user.Username, user.Active });
        }


        [Authorize(Policy = "RequireAdmin")]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            if (await _db.Users.AnyAsync(u => u.Username == req.Username))
                return Conflict("Utilisateur existant");

            var user = new User { Username = req.Username, StorageQuotaBytes = 1L * 1024 * 1024 * 1024 };
            var randomPassword = Path.GetRandomFileName();
            var hasher = new PasswordHasher<User>();
            user.PasswordHash = hasher.HashPassword(user, randomPassword);

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            _userFolderService.EnsureFolderForUser(user);

            return Ok(new { Username = user.Username });
        }

        [Authorize(Policy = "RequireAdmin")]
        [HttpDelete("remove/{id}")]
        public async Task<IActionResult> Remove(int id)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                return Conflict("Utilisateur inexistant");

            var username = user.Username;
            _db.Users.Remove(user);
            await _db.SaveChangesAsync();

            _userFolderService.DeleteFolderForUser(user);

            return Ok($"{username} supprimé");
        }

        [HttpPost("invite")]
        public IActionResult GenerateInvite([FromBody] InviteRequest request)
        {
            var secret = _config["InviteSecret"];
            if (string.IsNullOrEmpty(secret))
                return StatusCode(500, "Invite secret is missing.");

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(secret);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[] { new Claim("email", request.Email) }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            var origin = Request.Headers["Origin"].FirstOrDefault();

            // Si rien n’est envoyé (par ex. via Postman), on retombe sur le backend
            var baseUrl = !string.IsNullOrEmpty(origin)
                ? origin
                : $"{Request.Scheme}://{Request.Host}";

            var link = $"{baseUrl}/invite?token={tokenString}";
            return Ok(new { link });
        }

        [HttpPost("activate/{token}")]
        public async Task<IActionResult> ActivateUser(string token, [FromBody] SetPasswordRequest req)
        {
            var secret = _config["InviteSecret"];
            var handler = new JwtSecurityTokenHandler();
            try
            {
                var principal = handler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
                }, out var validatedToken);

                var email = principal.Claims.FirstOrDefault(c => c.Type.EndsWith("emailaddress", StringComparison.OrdinalIgnoreCase))?.Value;
                if (email == null) return BadRequest("Token invalide");

                // Validation côté backend
                var password = req.Password;
                if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
                    return BadRequest("Mot de passe trop faible");

                bool hasUpper = password.Any(char.IsUpper);
                bool hasLower = password.Any(char.IsLower);
                bool hasDigit = password.Any(char.IsDigit);
                bool hasSpecial = password.Any(ch => !char.IsLetterOrDigit(ch));

                int strength = 0;
                if (hasLower) strength++;
                if (hasUpper) strength++;
                if (hasDigit) strength++;
                if (hasSpecial) strength++;

                if (strength <= 2)
                    return BadRequest("Mot de passe trop faible");

                var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == email);
                if (user == null) return BadRequest("Utilisateur non trouvé");

                var hasher = new PasswordHasher<User>();
                user.PasswordHash = hasher.HashPassword(user, req.Password);
                user.Active = true;

                await _db.SaveChangesAsync();
                return Ok("Compte activé !");
            }
            catch
            {
                return BadRequest("Token invalide ou expiré");
            }
        }

        public class InviteRequest
        {
            public string Email { get; set; } = null!;
        }

        public class SetPasswordRequest
        {
            public string Password { get; set; } = null!;
        }

        public class RegisterRequest
        {
            public string Username { get; set; } = null!;
        }
    }
}