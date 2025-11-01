using Jellyfile.Server.Models;
using System.IO;

namespace Jellyfile.Server.Infrastructure
{
    public class UserFolderService
    {
        private readonly string _rootPath;

        public UserFolderService(string rootPath)
        {
            _rootPath = rootPath;

            if (!Directory.Exists(_rootPath))
                Directory.CreateDirectory(_rootPath);
        }

        public void SyncUserFolders(IEnumerable<User> users)
        {
            var existingFolders = Directory.GetDirectories(_rootPath)
                                           .Select(Path.GetFileName)
                                           .ToHashSet();

            var dbUsernames = users.Select(u => u.Username).ToHashSet();

            // Créer les dossiers manquants
            foreach (var user in users)
            {
                if (!existingFolders.Contains(user.Username))
                {
                    Directory.CreateDirectory(Path.Combine(_rootPath, user.Username));
                }
            }

            // Supprimer les dossiers sans utilisateur correspondant
            foreach (var folder in existingFolders)
            {
                if (!dbUsernames.Contains(folder))
                {
                    Directory.Delete(Path.Combine(_rootPath, folder), true);
                }
            }
        }

        // Crée le dossier pour un seul utilisateur
        public void EnsureFolderForUser(User user)
        {
            var userPath = Path.Combine(_rootPath, user.Username);
            if (!Directory.Exists(userPath))
                Directory.CreateDirectory(userPath);
        }

        // Supprime le dossier pour un seul utilisateur
        public void DeleteFolderForUser(User user)
        {
            var userPath = Path.Combine(_rootPath, user.Username);
            if (Directory.Exists(userPath))
                Directory.Delete(userPath, true);
        }

        public static string FindProjectRoot()
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            int maxLevels = 10;
            while (dir != null && dir.Name != "Jellyfile.Server" && maxLevels-- > 0)
            {
                dir = dir.Parent;
            }

            if (dir == null || dir.Name != "Jellyfile.Server")
                throw new Exception("Impossible de trouver le dossier Jellyfile.Server, vérifie la structure du projet");

            return dir.Parent.FullName;
        }
    }

}
