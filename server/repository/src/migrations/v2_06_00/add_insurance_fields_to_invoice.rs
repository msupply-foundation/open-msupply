use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_insurance_fields_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice
                    ADD COLUMN name_insurance_join_id TEXT
                    REFERENCES name_insurance_join (id);
                ALTER TABLE invoice
                    ADD COLUMN insurance_discount_amount {DOUBLE};
                ALTER TABLE invoice
                    ADD COLUMN insurance_discount_percentage {DOUBLE};
            "#
        )?;

        Ok(())
    }
}
