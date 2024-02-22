use crate::migrations::DATE;
use crate::migrations::DATETIME;
use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE asset (
            id TEXT NOT NULL PRIMARY KEY,
            serial_number TEXT NOT NULL, 
            asset_category_id TEXT REFERENCES asset_category (id),
            asset_type_id TEXT REFERENCES asset_type (id),
            catalogue_item_id, -- TODO: after merge https://github.com/msupply-foundation/open-msupply/pull/3036 TEXT REFERENCES catalogue_item (id)
            installation_date {DATE},
            replacement_date {DATE},
            deleted_datetime {DATETIME},
            created_datetime {DATETIME} NOT NULL,
            modified_datetime {DATETIME} NOT NULL,
            UNIQUE (serial_number, deleted_datetime) --If something doesn't have a serial number, one can be generated?
        );
        CREATE INDEX asset_category_id ON asset (asset_category_id);
        CREATE INDEX asset_type_id ON asset (asset_type_id);
        CREATE INDEX asset_catalogue_item_id ON asset (catalogue_item_id);
        CREATE INDEX asset_serial_number ON asset (serial_number);
        CREATE INDEX asset_deleted_datetime ON asset (deleted_datetime);
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TABLE asset_location (
            id TEXT NOT NULL PRIMARY KEY,
            asset_id TEXT NOT NULL REFERENCES asset (id),
            location_id TEXT NOT NULL REFERENCES location (id),
            created_datetime {DATETIME} NOT NULL,
            modified_datetime {DATETIME} NOT NULL,
            UNIQUE (asset_id, location_id)
        );
        CREATE INDEX asset_location_asset_id ON asset_location (asset_id);
        "#,
    )?;

    Ok(())
}
