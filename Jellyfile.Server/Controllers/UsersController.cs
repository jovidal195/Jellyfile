using Jellyfile.Server.Infrastructure;
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;


[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly MyDbContext _context;

    public UsersController(MyDbContext context)
    {
        _context = context;
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAllUsers()
    {
        // Vérification de session
        var userId = HttpContext.Session.GetInt32("UserId");
        if (userId == null)
            return Unauthorized(new { message = "Pas de session active" });

        // Vérification rôle (ex: seulement Admin peut voir tous les users)
        var currentUser = await _context.Users.FindAsync(userId.Value);
        if (currentUser == null || currentUser.Role != "Admin")
            return Forbid();

        var users = await _context.Users
            .Include(u => u.Profile) // Load profiles
            .ToListAsync();

        // Récupération sécurisée des users
        var result = users.Select(u => new
        {
            u.Id,
            u.Username,
            u.Role,
            u.Active,
            u.StorageQuotaBytes,
            Profile = u.Profile == null ? null : new
            {
                u.Profile.FirstName,
                u.Profile.LastName,
                u.Profile.Email,
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

        var currentUser = await _context.Users.FindAsync(userId.Value);
        if (currentUser == null || currentUser.Role != "Admin")
            return Forbid();

        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        user.Active = active;
        await _context.SaveChangesAsync();

        return Ok(new { user.Id, user.Username, user.Active });
    }
}