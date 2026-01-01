namespace Jellyfile.Server.Models
{
    public class Tag
    {
        public int Id { get; set; }
        public string Name { get; set; }

        public int UserId { get; set; }

        public ICollection<FileTag> FileTags { get; set; } = new List<FileTag>();
    }

    public class FileTag
    {
        public int FileId { get; set; }
        public File File { get; set; }

        public int TagId { get; set; }
        public Tag Tag { get; set; }

        
    }

}
