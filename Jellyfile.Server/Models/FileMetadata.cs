using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Jellyfile.Server.Models
{
    [Table("FileMetadata")]
    public class FileMetadata
    {
        /* Metadonnée génériques */
        [Key]
        public int Id { get; set; }

        [Required]
        public int FileId { get; set; }  // lien 1–1 avec File
        public File File { get; set; }

        [MaxLength(255)]
        public string? Title { get; set; }  // titre de l'oeuvre

        [MaxLength(255)]
        public string? Author { get; set; } // auteur humain

        public bool IsAiGenerated { get; set; } = false;

        [MaxLength(255)]
        public string? Source { get; set; } // optionnel

        [MaxLength(50)]
        public string? License { get; set; } // ex: CC-BY-4.0, MIT

        [MaxLength(255)]
        public string? CopyrightHolder { get; set; }

        public DateTime? CreationDate { get; set; }

        [MaxLength(50)]
        public string? Type { get; set; } // film, conférence, tutoriel, captation, etc.


        /* Metadonnée images */

        public bool IsVector { get; set; } = false;

        [MaxLength(20)]
        public string? Format { get; set; } // ex: PNG, JPEG, SVG

        [MaxLength(20)]
        public string? ColorMode { get; set; } // ex: RGB, CMYK, Grayscale

        public int? DPI { get; set; }

        public int? BitDepth { get; set; }

        [MaxLength(255)]
        public string? Collections { get; set; } // tags internes ou collections métier

        /* Métadonnées vidéo */

        [MaxLength(50)]
        public string? Language { get; set; }

        [MaxLength(50)]
        public string? SubtitleLanguage { get; set; }

        
        [MaxLength(50)]
        public string? Version { get; set; }
    }
}
