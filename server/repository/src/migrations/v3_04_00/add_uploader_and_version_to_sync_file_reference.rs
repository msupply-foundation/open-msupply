use crate::migrations::*;

/// Uploader and version number of a sync file (#909). Version numbers are
/// never reissued; existing rows are numbered by upload order within a name.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_uploader_and_version_to_sync_file_reference"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // one ALTER per column for SQLite; correlated count rather than a window function for SQLite/Postgres parity
        sql!(
            connection,
            r#"
                ALTER TABLE sync_file_reference
                ADD COLUMN user_id TEXT;

                ALTER TABLE sync_file_reference
                ADD COLUMN version_number INTEGER NOT NULL DEFAULT 1;

                UPDATE sync_file_reference
                SET version_number = (
                    SELECT COUNT(*)
                    FROM sync_file_reference AS earlier
                    WHERE earlier.table_name = sync_file_reference.table_name
                      AND earlier.record_id = sync_file_reference.record_id
                      AND earlier.file_name = sync_file_reference.file_name
                      AND (
                        earlier.created_datetime < sync_file_reference.created_datetime
                        OR (
                          earlier.created_datetime = sync_file_reference.created_datetime
                          AND earlier.id <= sync_file_reference.id
                        )
                      )
                );
            "#
        )?;

        Ok(())
    }
}
