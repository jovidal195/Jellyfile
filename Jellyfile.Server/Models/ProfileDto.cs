namespace Jellyfile.Server.Models
{
    public class ProfileDto
    {
        public int? UserId { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Gender { get; set; }

        public long? StorageQuotaBytes { get; set; }
    }
}
