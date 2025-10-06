using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Jellyfile.Server;
using Microsoft.EntityFrameworkCore;
using Jellyfile.Server.Models;

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
        if (user.Password != request.Password)
        {
            return Unauthorized("Mot de passe incorrect");
        }

        // Création de la session côté serveur
        HttpContext.Session.SetString("User", user.Username);

        return Ok(new { Message = "Logged in", Username = user.Username });
    }

    [HttpGet("me")]
    public IActionResult Me()
    {
        var username = HttpContext.Session.GetString("User");
        if (username == null)
            return Unauthorized("Pas de session");

        return Ok(new { Username = username });
    }
}

public class LoginRequest
{
    public string Username { get; set; }
    public string Password { get; set; }
}