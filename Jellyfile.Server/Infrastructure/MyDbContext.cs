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
        public DbSet<FailedFingerprint> FailedFingerprints { get; set; }

        public DbSet<Folder> Folders { get; set; }

        public DbSet<Tag> Tags { get; set; }
        public DbSet<FileTag> FileTags { get; set; }

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

            // FilePin
            modelBuilder.Entity<FilePin>()
                .HasKey(fp => fp.Id);

            // FilePin ↔ FailedFingerprint
            modelBuilder.Entity<FailedFingerprint>()
                .HasKey(ff => ff.Id);

            modelBuilder.Entity<FailedFingerprint>()
                .HasOne(ff => ff.FilePin)
                .WithMany(fp => fp.FailedFingerprints)
                .HasForeignKey(ff => ff.FilePinId)
                .OnDelete(DeleteBehavior.Cascade);

            // Folder
            modelBuilder.Entity<Folder>()
                .HasOne(f => f.Owner)
                .WithMany()
                .HasForeignKey(f => f.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Folder>()
                .HasOne(f => f.ParentFolder)
                .WithMany(f => f.SubFolders)
                .HasForeignKey(f => f.ParentFolderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Folder>()
                .HasIndex(f => new { f.OwnerId, f.Name, f.ParentFolderId })
                .IsUnique();

            modelBuilder.Entity<FileTag>()
                .HasKey(ft => new { ft.FileId, ft.TagId });

            modelBuilder.Entity<FileTag>()
                .HasOne(ft => ft.File)
                .WithMany(f => f.FileTags)
                .HasForeignKey(ft => ft.FileId);

            modelBuilder.Entity<FileTag>()
                .HasOne(ft => ft.Tag)
                .WithMany(t => t.FileTags)
                .HasForeignKey(ft => ft.TagId);

            modelBuilder.Entity<Tag>()
                .HasIndex(t => t.Name)
                .IsUnique();

        }
    }

}
