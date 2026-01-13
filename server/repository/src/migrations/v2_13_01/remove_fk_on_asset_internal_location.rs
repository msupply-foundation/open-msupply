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

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_13_01() {
    use crate::migrations::*;
    use crate::test_db::*;
    use v2_13_00::V2_13_00;
    use v2_13_01::V2_13_01;

    let previous_version = V2_13_00.version();
    let version = V2_13_01.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    #[cfg(not(feature = "postgres"))]
    println!("running sqlite");
    #[cfg(feature = "postgres")]
    println!("running postgres");

    sql!(
        &connection,
        r#"
        INSERT INTO name 
        (id, type, is_customer, is_supplier, code, name)
        VALUES 
        ('name_id', 'STORE', false, false, 'store_a', 'Store A');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
            INSERT INTO name_link 
            (id, name_id)
            VALUES 
            ('store_a', 'name_id');
        "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
            INSERT INTO store 
            (id, code, site_id, name_link_id)
            VALUES 
            ('store_a', 'store_a', '123', 'store_a');
        "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
            INSERT INTO location 
            (id, code, name, on_hold, store_id)
            VALUES 
            ('location_1', 'location_1', 'Location 1', false, 'store_a');
        "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
            INSERT INTO asset 
            (id, store_id, created_datetime, modified_datetime)
            VALUES 
            ('asset_a', 'store_a', '2022-01-01T00:00:00Z', '2022-01-01T00:00:00Z');
        "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
            INSERT INTO asset_internal_location 
            (id, asset_id, location_id)
            VALUES 
            ('id', 'asset_a', 'location_1');
        "#
    )
    .unwrap();

    // Run this migration
    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);
}
