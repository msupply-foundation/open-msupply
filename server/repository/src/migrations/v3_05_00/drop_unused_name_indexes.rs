use crate::migrations::*;

/// The first and last name indexes serve no query: name filters are `LIKE`
/// (SQLite) or `ILIKE` (Postgres) on part of the name, or the word search
/// (db_diesel/name_search.rs), and sorting lowercases the name, none of which
/// a plain index on the column can serve. Nothing filters a patient's first
/// or last name exactly. They only cost space and a write on each name save
/// (about 116 MB at 8M patients on Postgres).
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "drop_unused_name_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            DROP INDEX IF EXISTS index_name_first_name;
            DROP INDEX IF EXISTS index_name_last_name;
            "#
        )?;

        Ok(())
    }
}
