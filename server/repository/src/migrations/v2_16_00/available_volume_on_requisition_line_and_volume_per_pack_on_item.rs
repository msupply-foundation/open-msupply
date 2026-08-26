use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "available_volume_on_requisition_line_and_volume_per_pack_on_item"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item ADD COLUMN volume_per_pack {DOUBLE} DEFAULT 0.0 NOT NULL;
                ALTER TABLE requisition_line ADD COLUMN available_volume {DOUBLE};
                ALTER TABLE requisition_line ADD COLUMN location_type_id TEXT REFERENCES location_type(id);
            "#
        )?;

        sql!(
            connection,
            r#"
                UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'item'; 
            "#
        )?;

        Ok(())
    }
}
