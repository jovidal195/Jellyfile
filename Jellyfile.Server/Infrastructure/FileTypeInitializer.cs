using Jellyfile.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace Jellyfile.Server.Infrastructure
{
    public static class FileTypeInitializer
    {
        private static readonly FileType[] DefaultFileTypes = new[]
        {
            new FileType { Id = 1, Name = "Autre", MetadataTableName = null },
            new FileType { Id = 2, Name = "Image", MetadataTableName = "ImageMetadata" },
            new FileType { Id = 3, Name = "Video", MetadataTableName = "VideoMetadata" },
            new FileType { Id = 4, Name = "Audio", MetadataTableName = "AudioMetadata" },
            new FileType { Id = 5, Name = "Document", MetadataTableName = "DocumentMetadata" },
            new FileType { Id = 6, Name = "Archive", MetadataTableName = "ArchiveMetadata" },
            new FileType { Id = 7, Name = "Binary", MetadataTableName = "BinaryMetadata" },
            new FileType { Id = 8, Name = "Scripts", MetadataTableName = "CodeMetadata" },
            new FileType { Id = 9, Name = "Fonts", MetadataTableName = "FontMetadata" }
        };

        public static void EnsureFileTypesExist(MyDbContext db)
        {
            foreach (var ft in DefaultFileTypes)
            {
                // Vérifie si le type existe déjà par Id ou par Name
                bool exists = db.FileTypes.Any(x => x.Id == ft.Id || x.Name == ft.Name);
                if (!exists)
                {
                    db.FileTypes.Add(ft);
                }
            }

            db.SaveChanges();
        }
    }

    public static class FileExtensionInitializer
    {
        // Mapping FileTypeId → extensions
        private static readonly Dictionary<int, string[]> DefaultExtensions = new()
        {
            { 1, new string[0] }, // Autre (fallback)
            { 2, new[] { "jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg", "heic", "ico" } }, // Image
            { 3, new[] { "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "mpeg", "mpg" } }, // Video
            { 4, new[] { "mp3", "wav", "aac", "flac", "ogg", "wma", "m4a" } }, // Audio
            { 5, new[] { "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "odt", "ods", "odp" } }, // Document
            { 6, new[] { "zip", "rar", "7z", "tar", "gz", "bz2", "xz" } }, // Archive
            { 7, new[] { "exe", "dll", "bin", "com", "class", "so", "o" } }, // Binary / Exécutable
            { 8, new[] { "js", "ts", "py", "java", "cs", "cpp", "c", "sh", "bat", "ps1", "php", "rb" } }, // Scripts / Code
            { 9, new[] { "ttf", "otf", "woff", "woff2", "eot" } } // Fonts
        };

        public static void EnsureFileExtensionsExist(MyDbContext db)
        {
            foreach (var kv in DefaultExtensions)
            {
                var fileTypeId = kv.Key;
                var extensions = kv.Value;

                foreach (var ext in extensions)
                {
                    bool exists = db.FileExtensions.Any(fe => fe.FileTypeId == fileTypeId && fe.Extension == ext);
                    if (!exists)
                    {
                        db.FileExtensions.Add(new FileExtension
                        {
                            FileTypeId = fileTypeId,
                            Extension = ext
                        });
                    }
                }
            }

            db.SaveChanges();
        }
    }
}
