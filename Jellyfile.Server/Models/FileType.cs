using System.Collections.Generic;

namespace Jellyfile.Server.Models
{
    public class FileType
    {
        public int Id { get; set; } // PK
        public string Name { get; set; } // ex: Image, Video, Audio, PDF
        public string MetadataTableName { get; set; } // table de métadonnées spécifique

        public List<FileExtension> Extensions { get; set; } = new();
        public ICollection<File> Files { get; set; } = new List<File>();
    }
}
