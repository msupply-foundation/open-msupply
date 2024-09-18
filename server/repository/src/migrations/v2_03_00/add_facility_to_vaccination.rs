use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_facility_to_vaccination"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccination ADD COLUMN facility_name_id TEXT REFERENCES name(id);
                ALTER TABLE vaccination ADD COLUMN facility_free_text TEXT;
            "#
        )?;

        Ok(())
    }
}
