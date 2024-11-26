use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "report"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE om_report (
                    id TEXT NOT NULL PRIMARY KEY,
                    data TEXT NOT NULL
                );
            "#
        )?;

        Ok(())
    }
}
