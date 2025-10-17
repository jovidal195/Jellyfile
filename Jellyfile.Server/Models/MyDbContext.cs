using Microsoft.EntityFrameworkCore;
using Jellyfile.Server.Models; // <-- important pour le User

namespace Jellyfile.Server
{
    public class MyDbContext : DbContext
    {
        public MyDbContext(DbContextOptions<MyDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<UserGroup> UserGroups { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasOne(u => u.Profile)
                .WithOne(p => p.User)
                .HasForeignKey<UserProfile>(p => p.UserId);

            modelBuilder.Entity<UserGroup>()
                .HasKey(ug => new { ug.UserId, ug.GroupId });

            modelBuilder.Entity<UserGroup>()
                .HasOne(ug => ug.User).WithMany(u => u.UserGroups).HasForeignKey(ug => ug.UserId);
            modelBuilder.Entity<UserGroup>()
                .HasOne(ug => ug.Group).WithMany(g => g.UserGroups).HasForeignKey(ug => ug.GroupId);
        }
    }

}
