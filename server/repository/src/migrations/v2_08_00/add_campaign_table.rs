use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_campaign_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE campaign (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    start_date {DATE},
                    end_date {DATE},
                    deleted_datetime {DATETIME}
                );
            "#
        )?;

        Ok(())
    }
}
