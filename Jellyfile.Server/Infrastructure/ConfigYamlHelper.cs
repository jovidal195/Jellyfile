using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Collections.Generic;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

public static class ConfigYamlHelper
{
    public static string GetConfigFolder()
    {
        // cross-platform location
        if (OperatingSystem.IsWindows())
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Jellyfile");
        else
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".config", "jellyfile");
    }

    public static string GetConfigPath()
    {
        var folder = GetConfigFolder();
        Directory.CreateDirectory(folder);
        return Path.Combine(folder, "settings.yaml");
    }

    public static string GenerateSecret(int bytes = 32)
    {
        var key = new byte[bytes];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(key);
        return Convert.ToBase64String(key); // safe for URL if encoded; we'll store base64
    }

    public static void EnsureSettingsFileExists()
    {
        var path = GetConfigPath();
        if (File.Exists(path)) return;

        var secret = GenerateSecret(32);
        var dict = new Dictionary<string, object>
        {
            ["InviteSecret"] = secret,
            // ajoute d'autres settings par défaut ici si nécessaire
        };

        var serializer = new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        var yaml = serializer.Serialize(dict);
        File.WriteAllText(path, yaml, Encoding.UTF8);

        // try to tighten permissions (best-effort)
        try
        {
            if (!OperatingSystem.IsWindows())
            {
                // chmod 600
                var psi = new System.Diagnostics.ProcessStartInfo("chmod", $"600 \"{path}\"")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                System.Diagnostics.Process.Start(psi)?.WaitForExit();
            }
            else
            {
                // Windows: leave to admin or installer; could set ACLs if needed
            }
        }
        catch
        {
            // best-effort: ignore if can't set perms
        }
    }

    public static IDictionary<string, string> LoadSettingsYaml()
    {
        var path = GetConfigPath();
        if (!File.Exists(path)) return new Dictionary<string, string>();

        var yamlContent = File.ReadAllText(path, Encoding.UTF8);
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        var obj = deserializer.Deserialize<Dictionary<string, object>>(yamlContent) ?? new();
        var flat = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in obj)
            flat[kv.Key] = kv.Value?.ToString() ?? "";

        return flat;
    }
}
