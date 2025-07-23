use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_delete_rnr_form_activity_log_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE 'RNR_FORM_DELETED';
                "#
            )?;
        }

        Ok(())
    }
}
