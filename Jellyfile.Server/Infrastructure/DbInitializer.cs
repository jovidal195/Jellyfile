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
            db.Database.OpenConnection();

            try
            {
                var dbTables = db.GetType().GetProperties()
                               .Where(p => p.PropertyType.IsGenericType &&
                                           p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>));

                foreach (var dbTable in dbTables)
                {
                    var entityType = dbTable.PropertyType.GetGenericArguments()[0];
                    var entity = db.Model.FindEntityType(entityType);
                    if (entity == null) continue;

                    var tableName = entity.GetTableName();
                    
                    // Vérifie si la table existe
                    using (var checkCmd = db.Database.GetDbConnection().CreateCommand())
                    {
                        checkCmd.CommandText = $"SELECT name FROM sqlite_master WHERE type='table' AND name='{tableName}'";
                        var exists = checkCmd.ExecuteScalar() != null;

                        if (!exists)
                        {
                            // Table manquante → création automatique
                            var columns = entityType.GetProperties()
                            .Where(p => p.PropertyType.IsPrimitive || p.PropertyType == typeof(string) || p.PropertyType == typeof(DateTime))
                            .Select(p =>
                            {
                                var type = GetSqlType(p.PropertyType);
                                var notNull = p.PropertyType.IsValueType && Nullable.GetUnderlyingType(p.PropertyType) == null ? "NOT NULL" : "";
                                var defaultValue = type == "INTEGER" ? "DEFAULT 0" :
                                                   type == "BOOLEAN" ? "DEFAULT 0" :
                                                   type == "DATETIME" ? "DEFAULT CURRENT_TIMESTAMP" : "";
                                var columnDef = p.Name == "Id"
                                    ? $"{p.Name} INTEGER PRIMARY KEY"
                                    : $"{p.Name} {type} {notNull} {defaultValue}".Trim();
                                return columnDef;
                            });
                            var sql = $"CREATE TABLE [{tableName}] ({string.Join(",", columns)})";
                            using var createCmd = db.Database.GetDbConnection().CreateCommand();
                            createCmd.CommandText = sql;
                            createCmd.ExecuteNonQuery();
                        }
                    }

                    // Colonnes existantes
                    var existingColumns = new List<string>();
                    using (var command = db.Database.GetDbConnection().CreateCommand())
                    {
                        command.CommandText = $"PRAGMA table_info([{tableName}])";
                        //db.Database.OpenConnection();

                        using (var reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                existingColumns.Add(reader.GetString(reader.GetOrdinal("name")));
                            }
                        }

                        //db.Database.CloseConnection();
                    }

                    // Parcours des propriétés
                    foreach (var prop in entityType.GetProperties())
                    {
                        // Owned entity → créer colonnes aplaties
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

                        // 2Propriété simple → créer colonne
                        var underlyingType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;

                        if (underlyingType.IsPrimitive || underlyingType == typeof(string) || underlyingType.IsEnum || underlyingType == typeof(DateTime))
                        {
                            var columnName = prop.Name;
                            if (!existingColumns.Contains(columnName))
                            {
                                AddColumn(db, tableName, columnName, underlyingType);
                            }
                        }

                        foreach (var index in entity.GetIndexes())
                        {
                            if (!index.IsUnique) continue;
                            var indexName = index.GetDatabaseName();
                            using var idxCmd = db.Database.GetDbConnection().CreateCommand();
                            idxCmd.CommandText = $"CREATE UNIQUE INDEX IF NOT EXISTS [{indexName}] ON [{tableName}] ({string.Join(",", index.Properties.Select(p => p.Name))})";
                            idxCmd.ExecuteNonQuery();
                        }
                    }
                }
            }
            finally // 🔹 Ferme la connexion quoi qu’il arrive
            {
                db.Database.CloseConnection();
            }
        }

            private static void AddColumn(MyDbContext db, string tableName, string columnName, Type type)
            {
                string sql = $"ALTER TABLE [{tableName}] ADD COLUMN [{columnName}]";

                if (type.IsValueType && Nullable.GetUnderlyingType(type) == null)
                {
                    if (type == typeof(bool) || type == typeof(int) || type.IsEnum)
                        sql += " NOT NULL DEFAULT 0";
                    else if (type == typeof(long))
                        sql += " NOT NULL DEFAULT 0";
                    else if (type == typeof(DateTime))
                        sql += " NOT NULL DEFAULT CURRENT_TIMESTAMP";
                }

                try
                {
                    db.Database.ExecuteSqlRaw(sql);
                }
                catch
                {
                    // ignore si déjà existante
                }
            }

            private static string GetSqlType(Type type)
            {
                if (type == typeof(string)) return "TEXT";
                if (type == typeof(int)) return "INTEGER";
                if (type == typeof(long)) return "BIGINT";
                if (type == typeof(bool)) return "BOOLEAN";
                if (type == typeof(DateTime) || Nullable.GetUnderlyingType(type) == typeof(DateTime))
                    return "DATETIME";
                if (type.IsEnum) return "INTEGER";
                return "TEXT";
            }
    }
}
