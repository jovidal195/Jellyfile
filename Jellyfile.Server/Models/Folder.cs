using System.Collections.Generic;

namespace Jellyfile.Server.Models
{
    public class Folder
    {
        public int Id { get; set; }                 // identifiant unique DB
        public string Name { get; set; }            // nom du dossier
        public string? Uuid { get; set; }
        public int? ParentFolderId { get; set; }    // null si root
        public Folder ParentFolder { get; set; }
        public int OwnerId { get; set; }            // User.Id du propriétaire
        public User Owner { get; set; }
        public ICollection<File> Files { get; set; }
        public ICollection<Folder> SubFolders { get; set; }
    }
}