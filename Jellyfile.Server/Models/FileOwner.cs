using System;

namespace Jellyfile.Server.Models
{
    public enum PermissionLevel
    {
        Read = 0,
        Write = 1,
        Admin = 2
    }

    public class FileOwner
    {
        public int FileId { get; set; }
        public File File { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }

        // Droits
        public PermissionLevel Permission { get; set; } = PermissionLevel.Read;
        public DateTime? PermissionExpiresAt { get; set; }

        // PIN
        public string? Pin { get; set; }
        public DateTime? PinExpiresAt { get; set; }
    }
}
