using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Jellyfile.Server.Infrastructure;

[ApiController]
[Route("api/[controller]")]
public class RegisterController : ControllerBase
{
    private readonly MyDbContext _db;

    public RegisterController(MyDbContext db)
    {
        _db = db;
    }

    [Authorize(Policy = "RequireAdmin")]
    [HttpPost]
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

        return Ok(new { Username = user.Username });
    }
}

public class RegisterRequest
{
    public string Username { get; set; } = null!;
}
