using System;
using Microsoft.EntityFrameworkCore;


namespace Jellyfile.Server.Infrastructure
{
    public class UserStorageService
    {
        private readonly MyDbContext _db;

        public UserStorageService(MyDbContext db)
        {
            _db = db;
        }

        public async Task RecalculateStorageUsedBytes(int userId)
        {
            var files = await _db.FileOwners
                .Where(fo => fo.UserId == userId)
                .Select(fo => fo.File)
                .Where(f => f.IsActive)
                .Distinct()
                .ToListAsync();

            var total = files.Sum(f => f.SizeBytes);

            var user = await _db.Users.FindAsync(userId);
            if (user != null)
            {
                user.StorageUsedBytes = total;
                await _db.SaveChangesAsync();
            }
        }
    }
}
