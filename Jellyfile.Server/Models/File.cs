using Microsoft.VisualBasic.FileIO;
using System;
using System.Collections.Generic;

namespace Jellyfile.Server.Models
{
    public class File
    {
        public int Id { get; set; } // PK
        public string Name { get; set; } // nom du fichier sur le disque
        public string Path { get; set; } // chemin relatif dans le dossier utilisateur
        public long SizeBytes { get; set; } // taille
        public string Hash { get; set; } // intégrité / déduplication
        public string? Uuid { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedById { get; set; }
        public User CreatedBy { get; set; }

        public bool IsActive { get; set; } = true; // soft delete
        public DateTime? ExpirationAt { get; set; } // nullable pour fichiers sans expiration

        public int FileTypeId { get; set; }
        public FileType FileType { get; set; }

        public string StorageNode { get; set; } // pour indiquer le serveur ou noeud de stockage si plusieurs serveurs

        public bool IsAvatar { get; set; }

        public ICollection<FileOwner> Owners { get; set; } = new List<FileOwner>();
        public ICollection<FilePin> Pins { get; set; } = new List<FilePin>();
    }
}
