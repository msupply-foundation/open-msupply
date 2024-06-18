use super::{version::Version, Migration};

use crate::StorageConnection;

mod activity_log;
mod assets;
mod decimal_pack_size;
mod decimal_requisition_quantities;
mod demographics;
mod item_add_is_vaccine;
mod ledger;
mod name_property;
mod pg_enums;
mod program;
mod property;
mod store_add_name_link_id;
mod v6_sync_api_error_code;
mod vaccine_course;

pub(crate) struct V2_01_00;

impl Migration for V2_01_00 {
    fn version(&self) -> Version {
        Version::from_str("2.1.0")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Note, this migration deletes the consumption view which is recreated in decimal_pack_size
        // migration, i.e. this migration has to run first.
        store_add_name_link_id::migrate(connection)?;
        activity_log::migrate(connection)?;
        // The ledger is migrated in decimal_pack_size because the same views needed to be
        // re-created
        // ledger::migrate(connection)?;
        pg_enums::migrate(connection)?;
        decimal_pack_size::migrate(connection)?;
        decimal_requisition_quantities::migrate(connection)?;
        assets::migrate_assets(connection)?;
        v6_sync_api_error_code::migrate(connection)?;
        property::migrate(connection)?;
        name_property::migrate(connection)?;
        demographics::migrate(connection)?;
        vaccine_course::migrate(connection)?;
        program::migrate(connection)?;
        item_add_is_vaccine::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_01_00() {
    use v2_00_00::V2_00_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_00_00.version();
    let version = V2_01_00.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    add_translated_item(&connection).unwrap();

    // Check that the item doesn't need translation (before migration)
    assert!(!check_item_needs_translation(&connection));

    // Run this migration
    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);

    // Check that the item row needs to be translated
    assert!(check_item_needs_translation(&connection));
}

#[cfg(test)]
fn check_item_needs_translation(connection: &StorageConnection) -> bool {
    use crate::SyncBufferRowRepository;

    let sync_buffer_row = SyncBufferRowRepository::new(&connection)
        .find_one_by_record_id("F078B01C94DF4A5BA1EC0408CDD46B55")
        .unwrap()
        .unwrap();

    return sync_buffer_row.integration_datetime.is_none();
}

#[cfg(test)]
fn add_translated_item(connection: &StorageConnection) -> anyhow::Result<()> {
    use super::sql;

    // Create item records in sync_buffer
    sql!(
        connection,
        r#"
        INSERT INTO
    sync_buffer (
        "record_id",
        "received_datetime",
        "integration_datetime",
        "integration_error",
        "table_name",
        "action",
        "data",
        "source_site_id"
    )
VALUES
    (
        'F078B01C94DF4A5BA1EC0408CDD46B55',
        '2024-06-12 23:34:55.380381',
        '2024-06-12 23:34:57.451441',
        '',
        'item',
        'UPSERT',
        '{{"is_vaccine": true}}',
        NULL
    );
        "#,
    )?;

    Ok(())
}
