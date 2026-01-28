use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                ALTER TYPE invoice_type ADD VALUE 'PRESCRIPTION';
            "#,
        )?;

        sql!(
            connection,
            r#"
                ALTER TABLE invoice ADD clinician_id TEXT REFERENCES clinician(id);
            "#
        )?;

        Ok(())
    }
}
