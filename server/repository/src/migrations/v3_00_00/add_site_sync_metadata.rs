use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_site_sync_metadata"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Per-site sync metadata authored on the omSupply central server from v7
        // sync activity, then pushed up to legacy 4D (which used to maintain these
        // itself when remotes synced directly to it). All nullable: existing rows
        // and non-v7 sites simply leave them unset.
        sql!(
            connection,
            r#"
                ALTER TABLE site ADD COLUMN app_name TEXT;
                ALTER TABLE site ADD COLUMN app_version TEXT;
                ALTER TABLE site ADD COLUMN last_connection_datetime TIMESTAMP;
                ALTER TABLE site ADD COLUMN last_sync_datetime TIMESTAMP;
                ALTER TABLE site ADD COLUMN first_sync_datetime TIMESTAMP;
            "#
        )?;

        Ok(())
    }
}
