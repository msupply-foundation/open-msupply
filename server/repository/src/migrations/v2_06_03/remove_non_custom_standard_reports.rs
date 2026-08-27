use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_non_custom_standard_reports"
    }

    // For non-transfer-related processing of requisitions
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    DELETE FROM changelog WHERE record_id IN 
                    (SELECT id FROM report WHERE is_custom = false AND context = 'REPORT');
                    DELETE FROM report WHERE is_custom = false AND context = 'REPORT';
                "#
            )?;
        }

        Ok(())
    }
}
