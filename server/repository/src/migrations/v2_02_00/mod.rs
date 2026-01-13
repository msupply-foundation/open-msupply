use super::{version::Version, Migration, MigrationFragment};

use crate::StorageConnection;

mod add_asset_internal_location_changelog;
mod add_low_stock_and_requisition_line_id;
mod add_requisition_approved_activity_type;
mod consumption_and_replenishment_views;
mod create_missing_master_list_and_program;
mod create_system_user;
mod fix_rnr_form_line_columns;
mod item_ven;
mod remove_changelog_triggers;
mod report_add_report_context;
mod requisitions_in_period;
mod rnr_form;
mod stock_on_hand_add_total_stock;
mod store_preferences_for_reports;
mod sync;

pub(crate) struct V2_02_00;

impl Migration for V2_02_00 {
    fn version(&self) -> Version {
        Version::from_str("2.2.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_asset_internal_location_changelog::Migrate),
            Box::new(remove_changelog_triggers::Migrate),
            Box::new(create_missing_master_list_and_program::Migrate),
            Box::new(create_system_user::Migrate),
            Box::new(store_preferences_for_reports::Migrate),
            Box::new(rnr_form::Migrate),
            Box::new(report_add_report_context::Migrate),
            Box::new(item_ven::Migrate),
            Box::new(consumption_and_replenishment_views::Migrate),
            Box::new(sync::Migrate),
            Box::new(stock_on_hand_add_total_stock::Migrate),
            Box::new(add_low_stock_and_requisition_line_id::Migrate),
            Box::new(requisitions_in_period::Migrate),
            Box::new(add_requisition_approved_activity_type::Migrate),
            Box::new(fix_rnr_form_line_columns::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_02_00() {
    use v2_01_00::V2_01_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_01_00.version();
    let version = V2_02_00.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    // Run this migration
    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);
}
