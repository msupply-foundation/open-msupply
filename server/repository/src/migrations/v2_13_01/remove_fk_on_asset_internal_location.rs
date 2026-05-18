use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_fk_on_asset_internal_location"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE asset_internal_location DROP CONSTRAINT IF EXISTS asset_internal_location_location_id_fkey;
                "#
            )?;
        } else {
            // Sqlite does not support dropping foreign keys, so we need to recreate the table without the foreign key constraint
            sql!(
                connection,
                r#"
                    -- PRAGMA foreign_keys = OFF; -- No longer effective now that we're using transactions

                    -- Create new temp table without foreign key
                    CREATE TABLE IF NOT EXISTS asset_internal_location_new (
                        id TEXT PRIMARY KEY NOT NULL,
                        asset_id TEXT NOT NULL REFERENCES asset (id),-- this one is safe to keep as both asset and asset_internal_location are synced to OMS Central
                        location_id TEXT NOT NULL,
                        UNIQUE (location_id) -- Locations can only be assigned to be inside a single asset, this isn't tracking where the asset is, just what locations exist within it
                    );
                    -- Copy data
                    INSERT INTO asset_internal_location_new (id, asset_id, location_id)
                    SELECT id, asset_id, location_id FROM asset_internal_location;
                    -- Drop old table
                    DROP TABLE asset_internal_location;
                    -- Rename new table to old table name
                    ALTER TABLE asset_internal_location_new RENAME TO asset_internal_location;

                    -- PRAGMA foreign_keys = ON;
                "#
            )?;
        }

        Ok(())
    }
}
