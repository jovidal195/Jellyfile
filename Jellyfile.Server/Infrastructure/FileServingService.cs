// FileServingService.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace Jellyfile.Server.Infrastructure
{
    public class FileServingService
    {
        private readonly string[] _dangerousExtensions = new[]
        {
            ".html", ".htm",
            ".svg",
            ".js",
            ".json",
            ".xml",
            ".txt",
            ".exe"
        };

        public FileResult ServeFile(ControllerBase controller, string fullPath, string fileName)
        {
            var provider = new FileExtensionContentTypeProvider();
            if (!provider.TryGetContentType(fullPath, out var contentType))
                contentType = "application/octet-stream";

            // Header anti-sniff
            controller.Response.Headers["X-Content-Type-Options"] = "nosniff";

            var ext = Path.GetExtension(fullPath).ToLowerInvariant();
            bool forceDownload = _dangerousExtensions.Contains(ext);

            if (forceDownload)
            {
                controller.Response.Headers["Content-Disposition"] = $"attachment; filename=\"{fileName}\"";
                return controller.PhysicalFile(fullPath, contentType);
            }

            return controller.PhysicalFile(fullPath, contentType, fileDownloadName: fileName);
        }
    }
}
