use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "program_enrolment_status"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE program_enrolment DROP COLUMN status;
                ALTER TABLE program_enrolment ADD COLUMN status TEXT;
            "#,
        )?;

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                DROP TYPE program_enrolment_status;
            "#,
        )?;

        Ok(())
    }
}
