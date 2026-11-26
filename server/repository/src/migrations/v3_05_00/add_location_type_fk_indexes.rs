use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_location_type_fk_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_location_location_type_id_fkey
                ON location (location_type_id);
            CREATE INDEX IF NOT EXISTS index_item_restricted_location_type_id_fkey
                ON item (restricted_location_type_id);
            CREATE INDEX IF NOT EXISTS index_item_variant_location_type_id_fkey
                ON item_variant (location_type_id);
            CREATE INDEX IF NOT EXISTS index_requisition_line_location_type_id_fkey
                ON requisition_line (location_type_id);
            "#
        )?;

        Ok(())
    }
}
