use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_frontend_bundle_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // A published front-end bundle. The record syncs; the bundle's bytes travel
        // separately as a sync_file_reference (see decisions/2026-08-03_frontend_sync_transport.md).
        //
        // `version` is the front end's own version line (it is released from its own
        // repo) and is only used for identity and ordering. `server_version` is a value
        // on the *server's* version line — "built against server 3.2" — and is what the
        // compatibility check compares against this server's app version, since
        // Version::is_compatible_by_major_and_minor only makes sense within one line.
        sql!(
            connection,
            r#"
            CREATE TABLE frontend_bundle (
                id TEXT NOT NULL PRIMARY KEY,
                version TEXT NOT NULL,
                server_version TEXT NOT NULL,
                sha256 TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                description TEXT,
                created_datetime {DATETIME} NOT NULL
            );
            "#
        )?;

        // Postgres stores changelog_table_name as an ENUM, so the value must exist
        // before any changelog row can reference it. SQLite stores it as TEXT.
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'frontend_bundle';"#
            )?;
        }

        Ok(())
    }
}
