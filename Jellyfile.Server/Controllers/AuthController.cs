using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly MyDbContext _db;

    public AuthController(MyDbContext db)
    {
        _db = db;
    }
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Cherche l'utilisateur en base
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user == null)
        {
            return Unauthorized("Utilisateur inconnu");
        }

        // Vérifie le mot de passe
        var hasher = new PasswordHasher<User>();
        var verify = hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verify == PasswordVerificationResult.Failed) return Unauthorized("Mot de passe incorrect");

        var claims = new List<Claim>
    {
        new Claim(ClaimTypes.Name, user.Username),
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
    };

        if (user.Role != null)
            claims.Add(new Claim(ClaimTypes.Role, user.Role));

        var identity = new ClaimsIdentity(claims, "JellyCookie");
        var principal = new ClaimsPrincipal(identity);

        // ✅ Sign-in et génération du cookie JellyCookie
        await HttpContext.SignInAsync("JellyCookie", principal);


        HttpContext.Session.SetInt32("UserId", user.Id); // stocke l'id, pas le nom
        return Ok(new { Username = user.Username });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> LogoutAsync()
    {
        await HttpContext.SignOutAsync("JellyCookie");
        HttpContext.Session.Clear(); // supprime toutes les données de session
        return Ok(new { message = "Logged out" });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var id = HttpContext.Session.GetInt32("UserId");
        if (id == null)
            return Unauthorized(new { message = "Pas de session" });

        var user = await _db.Users
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return Unauthorized(new { message = "Utilisateur introuvable" });

        return Ok(new
        {
            Username = user.Username,
            Role = user.Role,
            Profile = user.Profile != null ? new
            {
                user.Profile.FirstName,
                user.Profile.LastName,
                user.Profile.Email
            } : null,
            Quota = new
            {
                user.StorageQuotaBytes,
                user.StorageUsedBytes
            }
        });
    }

}

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
}