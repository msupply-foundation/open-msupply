use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "report_add_prescription_context"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
            ALTER TYPE context_type ADD VALUE 'PRESCRIPTION';
            "#
            )?;
        }

        Ok(())
    }
}
