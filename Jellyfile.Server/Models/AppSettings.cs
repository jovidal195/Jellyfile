namespace Jellyfile.Server.Models
{
    public class AppSettings
    {
        public int Id { get; set; } = 1;

        // Branding
        public string ApplicationName { get; set; } = "Jellyfile";
        public string? LogoPath { get; set; }

        // Access control
        public bool IsPublic { get; set; } = false;

        // SMTP
        public string? SmtpHost { get; set; }
        public int? SmtpPort { get; set; }
        public string? SmtpUser { get; set; }
        public string? SmtpPassword { get; set; }

        // Email template
        public string? EmailTemplate { get; set; }

        // Theme - Light mode
        public string Light_LoginBg { get; set; } = "#f4f4f4";
        public string Light_LoginText { get; set; } = "#213547";
        public string Light_LoginInputBg { get; set; } = "#ffffff";
        public string Light_LoginInputText { get; set; } = "#213547";
        public string Light_LoginButtonBg { get; set; } = "#e53935";
        public string Light_LoginButtonText { get; set; } = "#ffffff";
        public string Light_LoginButtonHover { get; set; } = "#ad2b28";
        public string Light_InterfaceBg { get; set; } = "#ffffff";
        public string Light_InterfaceLeftboxBg { get; set; } = "#f4f4f4";
        public string Light_InterfaceText { get; set; } = "#808080";

        // Theme - Dark mode
        public string Dark_LoginBg { get; set; } = "#242424";
        public string Dark_LoginText { get; set; } = "rgba(255,255,255,0.87)";
        public string Dark_LoginInputBg { get; set; } = "#333";
        public string Dark_LoginInputText { get; set; } = "#ffffff";
        public string Dark_LoginButtonBg { get; set; } = "#6498ff";
        public string Dark_LoginButtonText { get; set; } = "#ffffff";
        public string Dark_LoginButtonHover { get; set; } = "#90b4fc";
        public string Dark_InterfaceBg { get; set; } = "#242424";
        public string Dark_InterfaceLeftboxBg { get; set; } = "#333";
        public string Dark_InterfaceText { get; set; } = "#ffffff";
    }
}
