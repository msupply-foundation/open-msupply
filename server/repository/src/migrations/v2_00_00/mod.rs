use super::{version::Version, Migration, MigrationFragment};

use crate::StorageConnection;

mod activity_log_add_zero_line;
mod add_source_site_id;
mod assets;
mod central_omsupply;
mod currency_add_is_active;
mod inventory_adjustment_logtype;
mod inventory_adjustment_permissions;
mod invoice_rename_tax;
mod linked_shipment;
mod name_deleted_datetime;
mod pack_variant;
mod remove_changelog_triggers;
mod report_views;
mod requisition_line_add_item_name;
mod returns;
mod stock_on_hand_add_item_name;
mod stocktake_line_add_item_name;
mod store_add_created_date;
mod sync_file_reference;
mod user_change_last_synced_to_optional;

pub(crate) struct V2_00_00;

impl Migration for V2_00_00 {
    fn version(&self) -> Version {
        Version::from_str("2.0.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            // Remove changelog triggers (time travelling, as the code was actually introduced in 2.2.0, but we want to run it early in a patch to avoid syncing changes updated in this version invoice_line_tax for example)
            Box::new(remove_changelog_triggers::Migrate),
            Box::new(add_source_site_id::Migrate),
            Box::new(central_omsupply::Migrate),
            Box::new(assets::MigrateAssets),
            Box::new(returns::MigrateReturns),
            Box::new(pack_variant::Migrate),
            Box::new(inventory_adjustment_permissions::Migrate),
            Box::new(store_add_created_date::Migrate),
            Box::new(activity_log_add_zero_line::Migrate),
            Box::new(linked_shipment::Migrate),
            Box::new(sync_file_reference::Migrate),
            Box::new(user_change_last_synced_to_optional::Migrate),
            Box::new(inventory_adjustment_logtype::Migrate),
            Box::new(report_views::Migrate),
            Box::new(requisition_line_add_item_name::Migrate),
            Box::new(stock_on_hand_add_item_name::Migrate),
            Box::new(currency_add_is_active::Migrate),
            Box::new(invoice_rename_tax::Migrate),
            Box::new(stocktake_line_add_item_name::Migrate),
            Box::new(name_deleted_datetime::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_00_00() {
    use crate::migrations::v1_07_00::V1_07_00;
    use crate::migrations::*;
    use crate::test_db::*;
    use crate::ChangelogRepository;

    let previous_version = V1_07_00.version();
    let version = V2_00_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    insert_merge_test_data(&connection);
    let changelog_repo = ChangelogRepository::new(&connection);
    let cursor_before = changelog_repo.latest_cursor().unwrap();

    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);

    let cursor_after = changelog_repo.latest_cursor().unwrap();

    assert_eq!(cursor_before, cursor_after);
}

#[cfg(test)]
fn insert_merge_test_data(connection: &StorageConnection) {
    use super::sql;

    sql!(
        connection,
        r#"
        INSERT INTO item 
            (id, name, code, default_pack_size, type, legacy_record)
        VALUES 
            ('item1', 'item1name', 'item1code', 1, 'STOCK', ''),
            ('item2', 'item2name', 'item2code', 2, 'STOCK', '');
        "#
    )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO item_link 
            (id, item_id)
        VALUES 
            ('item1', 'item1'),
            ('item2', 'item2');
        "#
    )
    .unwrap();
    sql!(
        connection,
        r#"
        INSERT INTO
            name (id, name, code, is_customer, is_supplier, type, is_sync_update)
        VALUES
            ('name1', 'name1name', 'name1code', TRUE, FALSE, 'STORE', TRUE);
        "#
    )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO
            name_link (id, name_id)
        VALUES
            ('name1', 'name1');
    "#
    )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO
            store (id, name_id, code, site_id, store_mode)
        VALUES
            ('store1', 'name1', 'store1code', 1, 'STORE');
        "#
    )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO
            sensor (id, serial, name, store_id)
        VALUES
            ('sensor1', 's1', 'sen1', 'store1');
      
        INSERT INTO
            temperature_log (id, temperature, sensor_id, store_id, datetime)
        VALUES
            ('temperature_log1', 1.0, 'sensor1', 'store1', '2023-01-20 12:23:34'),
            ('temperature_log2', 1.0, 'sensor1', 'store1', '2023-01-20 12:23:34'),
            ('temperature_log3', 1.0, 'sensor1', 'store1', '2023-01-20 12:23:34'),
            ('temperature_log4', 1.0, 'sensor1', 'store1', '2023-01-20 12:23:34');
        "#
    )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO
            requisition (
                id,
                requisition_number,
                store_id,
                created_datetime,
                max_months_of_stock,
                min_months_of_stock,
                status,
                type,
                name_link_id
            )
        VALUES
            ('requisition1', 1, 'store1', '2021-01-02 00:00:00', 2, 1, 'DRAFT', 'REQUEST', 'name1');
        "#
    )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO
        requisition_line (
            id,
            requisition_id,
            item_link_id,
            requested_quantity,
            suggested_quantity,
            supply_quantity,
            available_stock_on_hand,
            average_monthly_consumption,
            approved_quantity
        )
        VALUES
            ('requisition_line1', 'requisition1', 'item1', 1, 2, 2, 5, 3, 2),
            ('requisition_line2', 'requisition1', 'item1', 1, 2, 2, 5, 3, 2),
            ('requisition_line3', 'requisition1', 'item1', 1, 2, 2, 5, 3, 2),
            ('requisition_line4', 'requisition1', 'item2', 1, 2, 2, 5, 3, 2);
        "#
    )
    .unwrap();
}
