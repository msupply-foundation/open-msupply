use super::{version::Version, Migration, MigrationFragment};

mod add_bundled_item_table;
mod add_cold_storage_type_table;
mod add_demographic_indicator_types_to_activity_log;
mod add_expected_lifespan_to_assets;
mod add_item_variant_id_to_stock_line_and_invoice_line;
mod add_item_variant_id_to_stocktake_line;
mod add_manual_requisition_line_fields;
mod add_reason_option_table;
mod add_store_pref_use_extra_fields;
mod add_unserviceable_status_to_asset_status_enum;
mod delete_pack_variant;
mod indicator_indexes;
mod indicator_line_column_create_tables;
mod indicator_value_create_table;
mod item_changelog;
mod item_variant;
mod program_indicator_create_table;

use crate::StorageConnection;

pub(crate) struct V2_04_00;

impl Migration for V2_04_00 {
    fn version(&self) -> Version {
        Version::from_str("2.4.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(delete_pack_variant::Migrate),
            Box::new(add_reason_option_table::Migrate),
            Box::new(add_manual_requisition_line_fields::Migrate),
            Box::new(add_unserviceable_status_to_asset_status_enum::Migrate),
            Box::new(add_expected_lifespan_to_assets::Migrate),
            Box::new(add_cold_storage_type_table::Migrate),
            Box::new(item_variant::Migrate),
            Box::new(program_indicator_create_table::Migrate),
            Box::new(add_item_variant_id_to_stock_line_and_invoice_line::Migrate),
            Box::new(indicator_line_column_create_tables::Migrate),
            Box::new(indicator_value_create_table::Migrate),
            Box::new(add_bundled_item_table::Migrate),
            Box::new(add_demographic_indicator_types_to_activity_log::Migrate),
            Box::new(indicator_indexes::Migrate),
            Box::new(add_store_pref_use_extra_fields::Migrate),
            Box::new(add_item_variant_id_to_stocktake_line::Migrate),
            Box::new(item_changelog::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_04_00() {
    use v2_03_00::V2_03_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_03_00.version();
    let version = V2_04_00.version();

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
