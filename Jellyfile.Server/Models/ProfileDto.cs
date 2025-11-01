using System.ComponentModel.DataAnnotations;

namespace Jellyfile.Server.Models
{
    public class ProfileDto
    {
        public int? UserId { get; set; }
        public string? FirstName { get; set; }

        public string? LastName { get; set; }

        private string? _email;
        [EmailAddress(ErrorMessage = "Email invalide.")]
        public string? Email
        {
            get => _email;
            set => _email = string.IsNullOrWhiteSpace(value) ? null : value;
        }

        private string? _phone;
        [Phone(ErrorMessage = "Numéro de téléphone invalide.")]
        public string? Phone
        {
            get => _phone;
            set => _phone = string.IsNullOrWhiteSpace(value) ? null : value;
        }
        public string? Gender { get; set; }

        public long? StorageQuotaBytes { get; set; }
    }
}
