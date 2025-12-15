namespace Jellyfile.Server.Models
{
    public class FilePin
    {
        public int Id { get; set; }
        public int FileId { get; set; }
        public File File { get; set; }

        public string Pin { get; set; } = null!;
        public string? Note { get; set; } // description / note pour l’utilisateur
        public DateTime? ExpiresAt { get; set; }
        public int MaxDevices { get; set; }
        public int? FailedDevices { get; set; }

        public ICollection<FailedFingerprint> FailedFingerprints { get; set; } = new List<FailedFingerprint>();

    }
}
