use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_created_from_req_ids_to_requisition"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition ADD COLUMN created_from_requisition_id TEXT;
                ALTER TABLE requisition ADD COLUMN original_customer_id TEXT REFERENCES name(id);
            "#,
        )?;

        Ok(())
    }
}
