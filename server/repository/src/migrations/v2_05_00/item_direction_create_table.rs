use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "item_direction_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE item_direction (
                id TEXT NOT NULL PRIMARY KEY,
                item_id TEXT NOT NULL REFERENCES item(id),
                directions TEXT NOT NULL,
                priority {DOUBLE} NOT NULL
            );
        "#
        )?;

        Ok(())
    }
}
