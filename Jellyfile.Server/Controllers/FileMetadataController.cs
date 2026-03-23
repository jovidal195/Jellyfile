using Jellyfile.Server.Infrastructure; // MyDbContext
using Jellyfile.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SQLitePCL;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace Jellyfile.Server.Controllers
{
    [ApiController]
    public class FilesMetadataController : ControllerBase
    {
        private readonly MyDbContext _db;
        public FilesMetadataController(MyDbContext db) => _db = db;

        // PATCH /api/files/{fileUuid}/metadata
        [HttpPatch("api/files/{fileUuid}/metadata")]
        public async Task<IActionResult> PatchMetadata(string fileUuid, [FromBody] JsonElement raw)
        {
            if (string.IsNullOrWhiteSpace(fileUuid)) return BadRequest();

            var file = await _db.Files.SingleOrDefaultAsync(f => f.Uuid == fileUuid);
            if (file == null) return NotFound(new { message = "Fichier introuvable" });

            var entity = await _db.Set<FileMetadata>().SingleOrDefaultAsync(m => m.FileId == file.Id);
            if (entity == null)
            {
                entity = new FileMetadata { FileId = file.Id };
                _db.Set<FileMetadata>().Add(entity);
            }

            if (raw.TryGetProperty("title", out var titleProp))
                entity.Title = titleProp.ValueKind == JsonValueKind.Null ? null : titleProp.GetString();

            if (raw.TryGetProperty("author", out var authorProp))
                entity.Author = authorProp.ValueKind == JsonValueKind.Null ? null : authorProp.GetString();

            if (raw.TryGetProperty("isAiGenerated", out var aiProp) && aiProp.ValueKind != JsonValueKind.Null)
                entity.IsAiGenerated = aiProp.GetBoolean();

            if (raw.TryGetProperty("source", out var sourceProp))
                entity.Source = sourceProp.ValueKind == JsonValueKind.Null ? null : sourceProp.GetString();

            if (raw.TryGetProperty("license", out var licenseProp))
                entity.License = licenseProp.ValueKind == JsonValueKind.Null ? null : licenseProp.GetString();

            if (raw.TryGetProperty("copyrightHolder", out var copyrightProp))
                entity.CopyrightHolder = copyrightProp.ValueKind == JsonValueKind.Null ? null : copyrightProp.GetString();

            if (raw.TryGetProperty("creationDate", out var creationProp))
                entity.CreationDate = creationProp.ValueKind == JsonValueKind.Null ? null : creationProp.GetDateTime();

            if (raw.TryGetProperty("isVector", out var vectorProp) && vectorProp.ValueKind != JsonValueKind.Null)
                entity.IsVector = vectorProp.GetBoolean();

            if (raw.TryGetProperty("format", out var formatProp))
                entity.Format = formatProp.ValueKind == JsonValueKind.Null ? null : formatProp.GetString();

            if (raw.TryGetProperty("colorMode", out var colorProp))
                entity.ColorMode = colorProp.ValueKind == JsonValueKind.Null ? null : colorProp.GetString();

            if (raw.TryGetProperty("dpi", out var dpiProp) && dpiProp.ValueKind != JsonValueKind.Null)
                entity.DPI = dpiProp.GetInt32();

            if (raw.TryGetProperty("bitDepth", out var bitProp) && bitProp.ValueKind != JsonValueKind.Null)
                entity.BitDepth = bitProp.GetInt32();

            if (raw.TryGetProperty("collections", out var collectionsProp))
                entity.Collections = collectionsProp.ValueKind == JsonValueKind.Null ? null : collectionsProp.GetString();

            if (raw.TryGetProperty("language", out var languageProp))
                entity.Language = languageProp.ValueKind == JsonValueKind.Null ? null : languageProp.GetString();

            if (raw.TryGetProperty("subtitleLanguage", out var subtitleProp))
                entity.SubtitleLanguage = subtitleProp.ValueKind == JsonValueKind.Null ? null : subtitleProp.GetString();

            if (raw.TryGetProperty("type", out var typeProp))
                entity.Type = typeProp.ValueKind == JsonValueKind.Null ? null : typeProp.GetString();

            if (raw.TryGetProperty("version", out var versionProp))
                entity.Version = versionProp.ValueKind == JsonValueKind.Null ? null : versionProp.GetString();

            await _db.SaveChangesAsync();

            return Ok(new
            {
                entity.Title,
                entity.Author,
                entity.IsAiGenerated,
                entity.Source,
                entity.License,
                entity.CopyrightHolder,
                entity.CreationDate,
                entity.IsVector,
                entity.Format,
                entity.ColorMode,
                entity.DPI,
                entity.BitDepth,
                entity.Collections,
                entity.Language,
                entity.SubtitleLanguage,
                entity.Type,
                entity.Version
            });
        }
    }
}
