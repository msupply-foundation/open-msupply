use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vvm_status_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE vvm_status (
                    id TEXT NOT NULL PRIMARY KEY,
                    description TEXT NOT NULL,
                    code TEXT NOT NULL,
                    level INT NOT NULL,
                    is_active BOOL NOT NULL,
                    unusable BOOL NOT NULL DEFAULT false,
                    reason_id TEXT
                );
            "#
        )?;

        Ok(())
    }
}
