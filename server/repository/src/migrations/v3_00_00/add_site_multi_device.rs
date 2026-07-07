use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_site_multi_device"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Lets several devices sync to one site under a shared token; see
        // get_token / validate in sync_v7.
        sql!(
            connection,
            r#"
                ALTER TABLE site
                ADD COLUMN is_multi_device BOOLEAN NOT NULL DEFAULT FALSE;
            "#
        )?;

        Ok(())
    }
}
