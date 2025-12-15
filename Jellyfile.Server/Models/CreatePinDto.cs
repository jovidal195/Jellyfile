namespace Jellyfile.Server.Models
{
    public class CreatePinDto
    {
        public string Pin { get; set; } = null!;
        public string? Note { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int MaxDevices { get; set; }
    }

}
