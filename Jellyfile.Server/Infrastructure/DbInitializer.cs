using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.Reflection;

namespace Jellyfile.Server.Infrastructure
{
    public static class DbInitializer
    {
        public static void EnsureDatabaseReady(MyDbContext db)
        {
            db.Database.EnsureCreated();

            var dbTables = db.GetType().GetProperties()
                           .Where(p => p.PropertyType.IsGenericType &&
                                       p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>));

            foreach (var dbTable in dbTables)
            {
                var entityType = dbTable.PropertyType.GetGenericArguments()[0];
                var entity = db.Model.FindEntityType(entityType);
                if (entity == null) continue;

                var tableName = entity.GetTableName();

                // Colonnes existantes
                var existingColumns = new List<string>();
                using (var command = db.Database.GetDbConnection().CreateCommand())
                {
                    command.CommandText = $"PRAGMA table_info([{tableName}])";
                    db.Database.OpenConnection();

                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            existingColumns.Add(reader.GetString(reader.GetOrdinal("name")));
                        }
                    }

                    db.Database.CloseConnection();
                }

                // Parcours des propriétés
                foreach (var prop in entityType.GetProperties())
                {
                    // 1️⃣ Owned entity → créer colonnes aplaties
                    var ownedAttr = prop.PropertyType.GetCustomAttribute<OwnedAttribute>();
                    if (ownedAttr != null)
                    {
                        foreach (var subProp in prop.PropertyType.GetProperties())
                        {
                            var subColumnName = $"{prop.Name}_{subProp.Name}";
                            if (!existingColumns.Contains(subColumnName))
                            {
                                AddColumn(db, tableName, subColumnName, subProp.PropertyType);
                            }
                        }
                        continue;
                    }

                    // 2️⃣ Propriété simple → créer colonne
                    if (prop.PropertyType.IsPrimitive || prop.PropertyType == typeof(string) || prop.PropertyType == typeof(DateTime))
                    {
                        var columnName = prop.Name;
                        if (!existingColumns.Contains(columnName))
                        {
                            AddColumn(db, tableName, columnName, prop.PropertyType);
                        }
                    }

                    // 3️⃣ Tout le reste → navigation property → ignorer
                }
            }
        }

        private static void AddColumn(MyDbContext db, string tableName, string columnName, Type type)
        {
            string sql = $"ALTER TABLE [{tableName}] ADD COLUMN [{columnName}]";

            if (type == typeof(string))
                sql += " TEXT";
            else if (type == typeof(int))
                sql += " INTEGER";
            else if (type == typeof(long))
                sql += " BIGINT";
            else if (type == typeof(bool))
                sql += " BOOLEAN";
            else if (type == typeof(DateTime))
                sql += " DATETIME";
            else
                sql += " TEXT"; // fallback

            try
            {
                db.Database.ExecuteSqlRaw(sql);
            }
            catch
            {
                // ignore si déjà existante
            }
        }
    }
}
