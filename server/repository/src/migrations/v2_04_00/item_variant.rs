use crate::migrations::types::{DATETIME, DOUBLE};
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "item_variant"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Item variant Table
        sql!(
            connection,
            r#"
            CREATE TABLE item_variant (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                item_link_id TEXT NOT NULL REFERENCES item_link(id),
                --TODO temperature_range_id TEXT REFERENCES temperature_range(id),
                doses_per_unit {DOUBLE},
                manufacturer_link_id TEXT REFERENCES name_link(id),
                deleted_datetime {DATETIME}
            );
            "#
        )?;

        // Packaging variant Table
        sql!(
            connection,
            r#"
            CREATE TABLE packaging_variant (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                item_variant_id TEXT NOT NULL REFERENCES item_variant(id),
                packaging_level INT NOT NULL,
                pack_size {DOUBLE},
                volume_per_unit {DOUBLE},
                deleted_datetime {DATETIME}
            );
            "#
        )?;

        if cfg!(feature = "postgres") {
            // Postgres changelog variant
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'item_variant';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'packaging_variant';
                    "#
            )?;
        }

        Ok(())
    }
}
