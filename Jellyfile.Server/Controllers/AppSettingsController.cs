using Jellyfile.Server.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfile.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AppSettingsController : ControllerBase
    {
        private readonly MyDbContext _context;

        public AppSettingsController(MyDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Unauthorized(new { message = "Pas de session" });

            var user = await _context.Users.FindAsync(sessionUserId.Value);
            if (user == null) return Unauthorized();

            bool isAdmin = string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase);

            if (!isAdmin)
                return StatusCode(403, new { message = "Accès refusé" });

            var setting = _context.AppSettings.FirstOrDefault();

            if (setting == null)
                return NotFound();

            return Ok(setting);
        }

        [HttpPost]
        public async Task<IActionResult> Update([FromBody] AppSettingsDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Unauthorized(new { message = "Pas de session" });

            var user = await _context.Users.FindAsync(sessionUserId.Value);
            if (user == null) return Unauthorized();

            bool isAdmin = string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase);

            if (!isAdmin)
                return StatusCode(403, new { message = "Accès refusé" });

            var settings = await _context.AppSettings.FindAsync(1);

            if (settings == null)
                return NotFound();

            // Champs généraux
            settings.ApplicationName = dto.ApplicationName;
            settings.LogoPath = dto.LogoPath;
            settings.IsPublic = dto.IsPublic;

            settings.SmtpHost = dto.SmtpHost;
            settings.SmtpPort = string.IsNullOrWhiteSpace(dto.SmtpPort)
                ? null
                : int.TryParse(dto.SmtpPort, out var port)
                    ? port
                    : null;
            settings.SmtpUser = dto.SmtpUser;
            settings.SmtpPassword = dto.SmtpPassword;
            settings.EmailTemplate = dto.EmailTemplate;

            // LIGHT THEME
            settings.Light_LoginBg = dto.Light_LoginBg;
            settings.Light_LoginText = dto.Light_LoginText;
            settings.Light_LoginInputBg = dto.Light_LoginInputBg;
            settings.Light_LoginInputText = dto.Light_LoginInputText;
            settings.Light_LoginButtonBg = dto.Light_LoginButtonBg;
            settings.Light_LoginButtonText = dto.Light_LoginButtonText;
            settings.Light_LoginButtonHover = dto.Light_LoginButtonHover;
            settings.Light_InterfaceBg = dto.Light_InterfaceBg;
            settings.Light_InterfaceLeftboxBg = dto.Light_InterfaceLeftboxBg;
            settings.Light_InterfaceText = dto.Light_InterfaceText;

            // DARK THEME
            settings.Dark_LoginBg = dto.Dark_LoginBg;
            settings.Dark_LoginText = dto.Dark_LoginText;
            settings.Dark_LoginInputBg = dto.Dark_LoginInputBg;
            settings.Dark_LoginInputText = dto.Dark_LoginInputText;
            settings.Dark_LoginButtonBg = dto.Dark_LoginButtonBg;
            settings.Dark_LoginButtonText = dto.Dark_LoginButtonText;
            settings.Dark_LoginButtonHover = dto.Dark_LoginButtonHover;
            settings.Dark_InterfaceBg = dto.Dark_InterfaceBg;
            settings.Dark_InterfaceLeftboxBg = dto.Dark_InterfaceLeftboxBg;
            settings.Dark_InterfaceText = dto.Dark_InterfaceText;

            await _context.SaveChangesAsync();

            return Ok();
        }

        public class AppSettingsDto
        {
            public string ApplicationName { get; set; }
            public string LogoPath { get; set; }
            public bool IsPublic { get; set; }

            public string SmtpHost { get; set; }
            public string SmtpPort { get; set; }
            public string SmtpUser { get; set; }
            public string SmtpPassword { get; set; }
            public bool SmtpUseSsl { get; set; }
            public string EmailTemplate { get; set; }

            // LIGHT
            public string Light_LoginBg { get; set; }
            public string Light_LoginText { get; set; }
            public string Light_LoginInputBg { get; set; }
            public string Light_LoginInputText { get; set; }
            public string Light_LoginButtonBg { get; set; }
            public string Light_LoginButtonText { get; set; }
            public string Light_LoginButtonHover { get; set; }
            public string Light_InterfaceBg { get; set; }
            public string Light_InterfaceLeftboxBg { get; set; }
            public string Light_InterfaceText { get; set; }

            // DARK
            public string Dark_LoginBg { get; set; }
            public string Dark_LoginText { get; set; }
            public string Dark_LoginInputBg { get; set; }
            public string Dark_LoginInputText { get; set; }
            public string Dark_LoginButtonBg { get; set; }
            public string Dark_LoginButtonText { get; set; }
            public string Dark_LoginButtonHover { get; set; }
            public string Dark_InterfaceBg { get; set; }
            public string Dark_InterfaceLeftboxBg { get; set; }
            public string Dark_InterfaceText { get; set; }
        }
    }
}