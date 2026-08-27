use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_store_id_to_program_enrolment"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE program_enrolment ADD COLUMN store_id TEXT REFERENCES store(id);
            "#
        )?;

        Ok(())
    }
}
