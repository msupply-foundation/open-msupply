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

        // No changelog enum change needed on PG: `changelog.table_name` is plain TEXT
        // after `alter_changelog_table_for_sync_v7`, which drops the old
        // `changelog_table_name` type. An `ALTER TYPE` here would fail on Postgres.

        Ok(())
    }
}
