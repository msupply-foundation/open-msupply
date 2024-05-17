use super::{version::Version, Migration};

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
mod name_created_datetime;
mod pack_variant;
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

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        add_source_site_id::migrate(connection)?;
        central_omsupply::migrate(connection)?;
        assets::migrate_assets(connection)?;
        returns::migrate_returns(connection)?;
        pack_variant::migrate(connection)?;
        inventory_adjustment_permissions::migrate(connection)?;
        store_add_created_date::migrate(connection)?;
        activity_log_add_zero_line::migrate(connection)?;
        linked_shipment::migrate(connection)?;
        sync_file_reference::migrate(connection)?;
        user_change_last_synced_to_optional::migrate(connection)?;
        inventory_adjustment_logtype::migrate(connection)?;
        report_views::migrate(connection)?;
        requisition_line_add_item_name::migrate(connection)?;
        stock_on_hand_add_item_name::migrate(connection)?;
        currency_add_is_active::migrate(connection)?;
        invoice_rename_tax::migrate(connection)?;
        stocktake_line_add_item_name::migrate(connection)?;
        name_created_datetime::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_00_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V2_00_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
