use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "delete_self_referencing_name_store_joins"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Remove self-referencing name_store_joins
        sql!(
            connection,
            r#"DELETE
                FROM name_store_join 
                WHERE name_store_join.name_id IN (SELECT name_id FROM store WHERE store.id = name_store_join.store_id);"#
        )?;

        Ok(())
    }
}
