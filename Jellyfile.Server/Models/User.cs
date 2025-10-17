namespace Jellyfile.Server.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public string? Role { get; set; } // ex: "Admin", "User"
        public long StorageQuotaBytes { get; set; } // quota total en octets
        public long StorageUsedBytes { get; set; } // suivi rapide
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // navigation
        public UserProfile? Profile { get; set; }
        public ICollection<UserGroup> UserGroups { get; set; } = new List<UserGroup>();
    }
}
