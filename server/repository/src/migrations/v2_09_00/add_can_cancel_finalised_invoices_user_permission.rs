use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_can_cancel_finalised_invoices_user_permission"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE permission_type ADD VALUE 'CANCEL_FINALISED_INVOICES';
                "#
            )?;
        }

        Ok(())
    }
}
