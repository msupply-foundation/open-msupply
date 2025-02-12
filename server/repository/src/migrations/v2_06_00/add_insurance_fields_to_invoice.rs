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
                    ADD COLUMN IF NOT EXISTS
                        name_insurance_join_id TEXT
                    REFERENCES name_insurance_join (id),
                    ADD COLUMN IF NOT EXISTS
                        insurance_discount_amount {DOUBLE},
                    ADD COLUMN IF NOT EXISTS
                        insurance_discount_rate {DOUBLE};
            "#
        )?;

        Ok(())
    }
}
