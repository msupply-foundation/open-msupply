use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "requisition_add_destination_customer_link_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                ALTER TABLE requisition
                ADD COLUMN destination_customer_link_id TEXT;

                UPDATE requisition
                SET destination_customer_link_id = original_customer_id;

                ALTER TABLE requisition
                DROP COLUMN original_customer_id;

                ALTER TABLE requisition
                ADD CONSTRAINT requisition_destination_customer_link_id_fkey
                FOREIGN KEY (destination_customer_link_id) REFERENCES name_link(id);
           "#,
        )?;

        #[cfg(not(feature = "postgres"))]
        sql!(
            connection,
            r#"
                PRAGMA foreign_keys = OFF;

                ALTER TABLE requisition
                ADD COLUMN destination_customer_link_id TEXT REFERENCES name_link(id);

                UPDATE requisition
                SET destination_customer_link_id = original_customer_id;

                ALTER TABLE requisition
                DROP COLUMN original_customer_id;

                PRAGMA foreign_keys = ON;
         "#,
        )?;

        Ok(())
    }
}
