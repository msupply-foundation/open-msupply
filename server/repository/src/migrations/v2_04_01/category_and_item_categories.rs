use crate::migrations::types::DATETIME;
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "item_categories"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // category_group table
        sql!(
            connection,
            r#"
            CREATE TABLE category_group (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                -- no referential constraint due to circular dependency during sync integration
                root_id TEXT,
                deleted_datetime {DATETIME}
            );
            "#
        )?;
        // category table
        sql!(
            connection,
            r#"
            CREATE TABLE category (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category_group_id TEXT REFERENCES category_group(id),
                -- no referential constraint due to circular dependency during sync integration
                parent_id TEXT,
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

        if cfg!(feature = "postgres") {
            // Postgres changelog variant
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'category';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'item_category_join';
                    "#
            )?;
        }

        Ok(())
    }
}
