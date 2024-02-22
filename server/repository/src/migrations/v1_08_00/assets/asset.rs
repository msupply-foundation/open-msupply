use crate::migrations::DATE;
use crate::migrations::DATETIME;
use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE asset (
            id TEXT NOT NULL PRIMARY KEY,
            store_id TEXT NOT NULL REFERENCES store (id), -- This serves as the location of the asset at least for now
            serial_number TEXT NOT NULL, 
            asset_category_id TEXT REFERENCES asset_category (id),
            asset_type_id TEXT REFERENCES asset_type (id),
            asset_catalogue_item_id TEXT REFERENCES asset_catalogue_item (id),
            installation_date {DATE},
            replacement_date {DATE},
            deleted_datetime {DATETIME},
            created_datetime {DATETIME} NOT NULL,
            modified_datetime {DATETIME} NOT NULL,
            UNIQUE (serial_number, deleted_datetime) --If something doesn't have a serial number, one can be generated?
        );
        CREATE INDEX asset_category_id ON asset (asset_category_id);
        CREATE INDEX asset_type_id ON asset (asset_type_id);
        CREATE INDEX asset_catalogue_item_id ON asset (asset_catalogue_item_id);
        CREATE INDEX asset_serial_number ON asset (serial_number);
        CREATE INDEX asset_deleted_datetime ON asset (deleted_datetime);
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TABLE asset_internal_location (
            id TEXT NOT NULL PRIMARY KEY,
            asset_id TEXT NOT NULL REFERENCES asset (id),
            location_id TEXT NOT NULL REFERENCES location (id),
            created_datetime {DATETIME} NOT NULL,
            modified_datetime {DATETIME} NOT NULL, 
            UNIQUE (location_id) -- Locations can only be assigned to be inside a single asset, this isn't tracking where the asset is, just what locations exist within it
        );
        CREATE INDEX asset_internal_location_asset_id ON asset_internal_location (asset_id);
        "#,
    )?;

    Ok(())
}
