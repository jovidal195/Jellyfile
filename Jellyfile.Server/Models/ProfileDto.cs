using System.ComponentModel.DataAnnotations;

namespace Jellyfile.Server.Models
{
    public class ProfileDto
    {
        public int? UserId { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        [EmailAddress(ErrorMessage = "Email invalide.")]
        public string? Email { get; set; }
        [Phone(ErrorMessage = "Numéro de téléphone invalide.")]
        public string? Phone { get; set; }
        public string? Gender { get; set; }

        public long? StorageQuotaBytes { get; set; }
    }
}
