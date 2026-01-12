use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "store_preference_add_issue_in_foreign_currency"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE store_preference ADD COLUMN issue_in_foreign_currency bool NOT NULL DEFAULT false;
        "#
        )?;

        Ok(())
    }
}
