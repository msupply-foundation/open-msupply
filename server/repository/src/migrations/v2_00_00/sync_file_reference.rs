use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE sync_file_reference (
                id TEXT NOT NULL PRIMARY KEY,
                table_name TEXT NOT NULL, -- Associated Table
                record_id TEXT NOT NULL, -- Associated record id
                file_name TEXT NOT NULL,
                mime_type TEXT,
                uploaded_bytes INTEGER NOT NULL DEFAULT 0,
                downloaded_bytes INTEGER NOT NULL DEFAULT 0,
                total_bytes INTEGER NOT NULL DEFAULT 0,
                retries INTEGER NOT NULL DEFAULT 0,
                retry_at TIMESTAMP,
                direction TEXT NOT NULL,
                status TEXT NOT NULL,
                error TEXT,
                created_datetime TIMESTAMP NOT NULL, -- No modified datetime, as we don't allow updates it would break sync
                deleted_datetime TIMESTAMP
            );
        "#,
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'sync_file_reference';
            "#
        )?;
    }

    Ok(())
}
