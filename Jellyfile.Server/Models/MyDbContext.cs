using Microsoft.EntityFrameworkCore;
using Jellyfile.Server.Models; // <-- important pour le User

namespace Jellyfile.Server
{
    public class MyDbContext : DbContext
    {
        public MyDbContext(DbContextOptions<MyDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
    }
}
