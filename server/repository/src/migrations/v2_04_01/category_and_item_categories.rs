use crate::migrations::types::DATETIME;
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "item_categories"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // category table
        sql!(
            connection,
            r#"
            CREATE TABLE category (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                parent_id TEXT, -- REFERENCES category_id (Not added as referential constraint due to circular dependency during sync integration)
                deleted_datetime {DATETIME}
            );
            "#
        )?;

        // item_category_join table
        sql!(
            connection,
            r#"
            CREATE TABLE item_category_join (
                id TEXT PRIMARY KEY NOT NULL,
                item_id TEXT NOT NULL REFERENCES item(id),
                category_id TEXT NOT NULL REFERENCES category(id),
                deleted_datetime {DATETIME}
            );
            "#
        )?;

        Ok(())
    }
}
