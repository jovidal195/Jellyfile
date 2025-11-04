using Jellyfile.Server.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic.FileIO;
using File = Jellyfile.Server.Models.File;

namespace Jellyfile.Server.Infrastructure
{
    public class MyDbContext : DbContext
    {
        public MyDbContext(DbContextOptions<MyDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<UserGroup> UserGroups { get; set; }

        public DbSet<File> Files { get; set; }
        public DbSet<FileType> FileTypes { get; set; }
        public DbSet<FileExtension> FileExtensions { get; set; }
        public DbSet<FileOwner> FileOwners { get; set; }
        public DbSet<FilePin> FilePins { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Users
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasOne(u => u.Profile)
                .WithOne(p => p.User)
                .HasForeignKey<UserProfile>(p => p.UserId);

            // UserGroups
            modelBuilder.Entity<UserGroup>()
                .HasKey(ug => new { ug.UserId, ug.GroupId });

            modelBuilder.Entity<UserGroup>()
                .HasOne(ug => ug.User).WithMany(u => u.UserGroups).HasForeignKey(ug => ug.UserId);
            modelBuilder.Entity<UserGroup>()
                .HasOne(ug => ug.Group).WithMany(g => g.UserGroups).HasForeignKey(ug => ug.GroupId);

            // FileOwners
            modelBuilder.Entity<FileOwner>()
                .HasKey(fo => new { fo.FileId, fo.UserId });

            modelBuilder.Entity<FileOwner>()
                .HasOne(fo => fo.File)
                .WithMany(f => f.Owners)
                .HasForeignKey(fo => fo.FileId);

            modelBuilder.Entity<FileOwner>()
                .HasOne(fo => fo.User)
                .WithMany()
                .HasForeignKey(fo => fo.UserId);

            // FileType
            modelBuilder.Entity<FileType>()
                .HasIndex(ft => ft.Name)
                .IsUnique();

            modelBuilder.Entity<FileType>()
                .Property(ft => ft.MetadataTableName)
                .IsRequired(false);

            // File
            modelBuilder.Entity<File>()
                .HasOne(f => f.FileType)
                .WithMany(ft => ft.Files)
                .HasForeignKey(f => f.FileTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // FileExtension
            modelBuilder.Entity<FileExtension>()
                .HasKey(fe => fe.Id);

            modelBuilder.Entity<FileExtension>()
                .HasIndex(fe => new { fe.FileTypeId, fe.Extension })
                .IsUnique();

            modelBuilder.Entity<FileExtension>()
                .HasOne(fe => fe.FileType)
                .WithMany(ft => ft.Extensions)
                .HasForeignKey(fe => fe.FileTypeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

}
