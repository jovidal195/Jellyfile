using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Jellyfile.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InviteController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly MyDbContext _db;

        public InviteController(IConfiguration config, MyDbContext db)
        {
            _config = config;
            _db = db;
        }

        [HttpPost("generate")]
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
    }

    // Classes modèles
    public class InviteRequest
    {
        public string Email { get; set; } = null!;
    }

    public class SetPasswordRequest
    {
        public string Password { get; set; } = null!;
    }
}
