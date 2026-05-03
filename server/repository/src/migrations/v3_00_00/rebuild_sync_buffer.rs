use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rebuild_sync_buffer"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let cursor_col = if cfg!(feature = "postgres") {
            "cursor SERIAL NOT NULL"
        } else {
            "cursor INTEGER PRIMARY KEY AUTOINCREMENT"
        };

        // CREATE TABLE has to be one complete statement per backend; `batch_execute`
        // (which `sql!` uses) rejects partial DDL.
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE TABLE sync_buffer_new (
                    {cursor_col},
                    record_id TEXT NOT NULL,
                    received_datetime TIMESTAMP NOT NULL,
                    integration_started_datetime TIMESTAMP,
                    integration_datetime TIMESTAMP,
                    integration_error TEXT,
                    integration_result TEXT,
                    table_name TEXT NOT NULL,
                    action TEXT NOT NULL,
                    data TEXT NOT NULL,
                    sync_version TEXT NOT NULL DEFAULT 'V5_V6',
                    app_version TEXT,
                    source_site_id INTEGER NOT NULL,
                    store_id TEXT,
                    transfer_store_id TEXT,
                    patient_id TEXT,
                    reference TEXT,
                    is_integrated BOOLEAN NOT NULL DEFAULT FALSE,
                    PRIMARY KEY (cursor, is_integrated)
                ) PARTITION BY LIST (is_integrated);

                CREATE TABLE sync_buffer_pending PARTITION OF sync_buffer_new FOR VALUES IN (false);
                CREATE TABLE sync_buffer_archive PARTITION OF sync_buffer_new FOR VALUES IN (true);
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                CREATE TABLE sync_buffer_new (
                    {cursor_col},
                    record_id TEXT NOT NULL,
                    received_datetime TIMESTAMP NOT NULL,
                    integration_started_datetime TIMESTAMP,
                    integration_datetime TIMESTAMP,
                    integration_error TEXT,
                    integration_result TEXT,
                    table_name TEXT NOT NULL,
                    action TEXT NOT NULL,
                    data TEXT NOT NULL,
                    sync_version TEXT NOT NULL DEFAULT 'V5_V6',
                    app_version TEXT,
                    source_site_id INTEGER NOT NULL,
                    store_id TEXT,
                    transfer_store_id TEXT,
                    patient_id TEXT,
                    reference TEXT,
                    is_integrated BOOLEAN NOT NULL DEFAULT FALSE
                );
                "#
            )?;
        }

        sql!(
            connection,
            r#"
            INSERT INTO sync_buffer_new (
                record_id, received_datetime, integration_started_datetime, integration_datetime,
                integration_error, table_name, action, data, sync_version,
                app_version, source_site_id, store_id, transfer_store_id, patient_id, reference,
                is_integrated
            )
            SELECT
                record_id,
                received_datetime,
                integration_datetime,
                integration_datetime,
                integration_error,
                table_name,
                action,
                data,
                'V5_V6',
                NULL,
                COALESCE(
                    source_site_id,
                    (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID'),
                    0
                ),
                store_id,
                transfer_store_id,
                patient_id,
                NULL,
                integration_datetime IS NOT NULL
            FROM sync_buffer
            ORDER BY received_datetime;

            DROP TABLE sync_buffer;
            ALTER TABLE sync_buffer_new RENAME TO sync_buffer;
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER SEQUENCE sync_buffer_new_cursor_seq RENAME TO sync_buffer_cursor_seq;
                CREATE INDEX index_sync_buffer_pending
                    ON sync_buffer_pending (source_site_id, reference, sync_version, table_name);
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                CREATE INDEX index_sync_buffer_pending
                    ON sync_buffer (source_site_id, reference, sync_version, table_name)
                    WHERE is_integrated = FALSE;
                "#
            )?;
        }

        Ok(())
    }
}
