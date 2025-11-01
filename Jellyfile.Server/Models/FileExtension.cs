using Jellyfile.Server.Models;

public class FileExtension
{
    public int Id { get; set; }  // Must be int
    public string Extension { get; set; } = null!;
    public int FileTypeId { get; set; }
    public FileType FileType { get; set; } = null!;
}