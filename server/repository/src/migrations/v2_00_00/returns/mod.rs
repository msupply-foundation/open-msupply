use crate::migrations::*;

pub mod return_context_types;
pub mod return_invoice_types;
pub mod return_permissions;
pub mod return_reasons;

pub(crate) struct MigrateReturns;

impl MigrationFragment for MigrateReturns {
    fn identifier(&self) -> &'static str {
        "migrate_returns"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        return_reasons::migrate(connection)?;
        return_invoice_types::migrate(connection)?;
        return_context_types::migrate(connection)?;
        return_permissions::migrate(connection)?;
        Ok(())
    }
}
