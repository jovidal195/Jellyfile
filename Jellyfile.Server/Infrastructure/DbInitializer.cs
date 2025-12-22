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
                            .Where(p =>
                            {
                                var type = Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType;
                                return type.IsPrimitive || type == typeof(string) || type == typeof(DateTime) || type.IsEnum;
                            })
                            .Select(p =>
                            {
                                var underlyingType = Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType;
                                var type = GetSqlType(underlyingType);
                                var notNull = p.PropertyType.IsValueType && Nullable.GetUnderlyingType(p.PropertyType) == null ? "NOT NULL" : "";
                                var defaultValue = "";
                                if (!IsNullable(p.PropertyType))
                                {
                                    if (type == "INTEGER" || type == "BOOLEAN")
                                        defaultValue = "DEFAULT 0";
                                    else if (type == "DATETIME")
                                        defaultValue = "DEFAULT CURRENT_TIMESTAMP";
                                }
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

                    // Parcours des propriétés → créer toutes les colonnes
                    foreach (var prop in entityType.GetProperties())
                    {
                        var underlyingType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;

                        if (underlyingType.IsPrimitive || underlyingType == typeof(string) || underlyingType.IsEnum || underlyingType == typeof(DateTime))
                        {
                            var columnName = prop.Name;
                            if (!existingColumns.Contains(columnName))
                            {
                                AddColumn(db, tableName, columnName, prop.PropertyType);
                                existingColumns.Add(columnName);
                            }
                        }
                    }

                    // Créer les indexes UNIQUES après que toutes les colonnes existent
                    foreach (var index in entity.GetIndexes())
                    {
                        if (!index.IsUnique) continue;

                        // S'assurer que toutes les colonnes de l'index existent
                        foreach (var prop in index.Properties)
                        {
                            var columnName = prop.Name;
                            if (!existingColumns.Contains(columnName))
                            {
                                var type = Nullable.GetUnderlyingType(prop.ClrType) ?? prop.ClrType;
                                AddColumn(db, tableName, columnName, prop.ClrType);
                                existingColumns.Add(columnName);
                            }
                        }

                        var indexName = index.GetDatabaseName();
                        using var idxCmd = db.Database.GetDbConnection().CreateCommand();
                        idxCmd.CommandText = $"CREATE UNIQUE INDEX IF NOT EXISTS [{indexName}] ON [{tableName}] ({string.Join(",", index.Properties.Select(p => p.Name))})";
                        idxCmd.ExecuteNonQuery();
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

            var underlyingType = Nullable.GetUnderlyingType(type) ?? type;
            bool isNullable = Nullable.GetUnderlyingType(type) != null || !underlyingType.IsValueType;

            // Seulement les types non-nullable ont un DEFAULT
            if (!isNullable)
            {
                if (underlyingType == typeof(bool) || underlyingType == typeof(int) || underlyingType.IsEnum)
                    sql += " NOT NULL DEFAULT 0";
                else if (underlyingType == typeof(long))
                    sql += " NOT NULL DEFAULT 0";
                else if (underlyingType == typeof(DateTime))
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


        private static bool IsNullable(Type t) =>
            !t.IsValueType || Nullable.GetUnderlyingType(t) != null;

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
