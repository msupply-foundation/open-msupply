use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_item_warning_link_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE item_warning_link (
                    id TEXT NOT NULL PRIMARY KEY,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    warning_id TEXT NOT NULL REFERENCES warning(id),
                    priority BOOLEAN not null
                );
            "#
        )?;

        Ok(())
    }
}
