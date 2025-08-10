use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_last_fix_ledger_run_key_value_store"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'LAST_LEDGER_FIX_RUN';
                    ALTER TYPE system_log_type ADD VALUE IF NOT EXISTS 'LEDGER_FIX_ERROR';
                    ALTER TYPE system_log_type ADD VALUE IF NOT EXISTS 'LEDGER_FIX';
                "#
            )?;
        }

        Ok(())
    }
}
