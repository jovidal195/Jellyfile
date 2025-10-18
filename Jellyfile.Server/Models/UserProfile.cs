namespace Jellyfile.Server.Models
{
    public class UserProfile
    {
        public int Id { get; set; } // même Id ou FK vers User
        public int UserId { get; set; }
        public string Gender { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        // autres données personnelles optionnelles

        public User User { get; set; } = null!;
    }
}
