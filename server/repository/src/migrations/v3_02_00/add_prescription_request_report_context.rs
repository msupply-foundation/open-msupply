use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_prescription_request_report_context"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE context_type ADD VALUE IF NOT EXISTS 'PRESCRIPTION_REQUEST';
                "#
            )?;
        }

        Ok(())
    }
}
