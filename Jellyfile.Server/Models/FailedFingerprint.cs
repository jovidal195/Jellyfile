namespace Jellyfile.Server.Models
{
    public class FailedFingerprint
    {
        public int Id { get; set; }
        public int FilePinId { get; set; }
        public FilePin FilePin { get; set; }
        public string Fingerprint { get; set; } = "";
        public int FailCount { get; set; }
    }
}
