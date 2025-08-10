use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_more_dates_to_purchase_order"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE purchase_order ADD COLUMN authorised_datetime {DATETIME};
                ALTER TABLE purchase_order ADD COLUMN finalised_datetime {DATETIME};
            "#
        )?;

        Ok(())
    }
}
