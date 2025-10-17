using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Jellyfile.Server;
using Microsoft.EntityFrameworkCore;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Identity;

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

        HttpContext.Session.SetInt32("UserId", user.Id); // stocke l'id, pas le nom
        return Ok(new { Username = user.Username });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
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