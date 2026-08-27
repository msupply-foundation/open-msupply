use crate::{
    migrations::{sql, MigrationFragment},
    StorageConnection,
};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reprocess_options_for_shipment_variance"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Re-translate  options on the next sync.
        // This needed because a new shipment_variance option type was added in v2.20.0
        // But if the options have already been syned to an old version of the client the reasons won't show up as the sync buffer records had already failed to integrate.

        sql!(
            connection,
            r#"
            UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'options';
        "#,
        )?;

        Ok(())
    }
}
