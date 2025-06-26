use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_campaign_change_log_table_name;
mod add_campaign_id_to_invoice_line_row;
mod add_campaign_id_to_stock_line;
mod add_campaign_table;
mod add_created_fields_to_item_variant;
mod add_donor_id_to_invoice_and_invoice_lines;
mod add_donor_id_to_stock_lines;
mod add_donor_id_to_stocktake_line;
mod add_doses_columns_to_item_variant;
mod add_initial_stocktake_field;
mod add_item_variant_enums_to_activity_log;
mod add_open_vial_wastage_to_reason_option_type;
mod add_population_percentage_to_demographic;
mod add_view_and_edit_vvm_status_permission;
mod add_vvm_status_id_to_invoice_line;
mod add_vvm_status_id_to_stock_line;
mod add_vvm_status_log_change_log_table_name;
mod add_vvm_status_log_table;
mod add_vvm_status_log_update_to_activity_log;
mod add_vvm_status_table;
mod donor_id_to_donor_link_id;
mod migrate_reason_option_ids;
mod reintegrate_options_sync_buffer_records;
mod rename_vaccine_course_is_active_to_use_in_gaps;
mod sync_donor_id_to_existing_stock_and_invoice_lines;

pub(crate) struct V2_08_00;

impl Migration for V2_08_00 {
    fn version(&self) -> Version {
        Version::from_str("2.8.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_vvm_status_table::Migrate),
            Box::new(add_doses_columns_to_item_variant::Migrate),
            Box::new(add_initial_stocktake_field::Migrate),
            Box::new(add_created_fields_to_item_variant::Migrate),
            Box::new(add_item_variant_enums_to_activity_log::Migrate),
            Box::new(add_vvm_status_log_change_log_table_name::Migrate),
            Box::new(add_view_and_edit_vvm_status_permission::Migrate),
            Box::new(add_donor_id_to_invoice_and_invoice_lines::Migrate),
            Box::new(add_vvm_status_log_update_to_activity_log::Migrate),
            Box::new(add_vvm_status_id_to_stock_line::Migrate),
            Box::new(add_campaign_table::Migrate),
            Box::new(add_campaign_change_log_table_name::Migrate),
            Box::new(add_donor_id_to_stock_lines::Migrate),
            Box::new(add_donor_id_to_stocktake_line::Migrate),
            Box::new(migrate_reason_option_ids::Migrate),
            Box::new(add_vvm_status_log_table::Migrate),
            Box::new(add_vvm_status_id_to_invoice_line::Migrate),
            Box::new(add_open_vial_wastage_to_reason_option_type::Migrate),
            Box::new(add_campaign_id_to_stock_line::Migrate),
            Box::new(reintegrate_options_sync_buffer_records::Migrate),
            Box::new(donor_id_to_donor_link_id::Migrate),
            Box::new(add_campaign_id_to_invoice_line_row::Migrate),
            Box::new(add_population_percentage_to_demographic::Migrate),
            Box::new(rename_vaccine_course_is_active_to_use_in_gaps::Migrate),
            Box::new(sync_donor_id_to_existing_stock_and_invoice_lines::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {

    #[actix_rt::test]
    async fn migration_2_08_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_07_00::V2_07_00;
        use v2_08_00::V2_08_00;

        let previous_version = V2_07_00.version();
        let version = V2_08_00.version();

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
}
