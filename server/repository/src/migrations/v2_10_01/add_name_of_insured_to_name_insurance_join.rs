use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_name_of_insured_to_name_insurance_join"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE name_insurance_join ADD COLUMN name_of_insured TEXT;
            "#
        )?;

        Ok(())
    }
}
