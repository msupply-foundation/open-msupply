use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_in_progress_and_error_statuses_sync_message;
mod add_invoice_received_qty_updated_activity_log_type;
mod add_linked_invoice_line_id_to_invoice_line;
mod add_plugin_data_datetime_field;
mod add_plugin_data_indexes;
mod add_received_number_of_packs_to_invoice_line;
mod add_shipment_variance_reason_option_type;
mod add_stocktake_edited_activity_log_type;
mod add_support_upload_files_processor_cursor_key_value_store;

pub(crate) struct V2_20_00;
impl Migration for V2_20_00 {
    fn version(&self) -> Version {
        Version::from_str("2.20.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_plugin_data_indexes::Migrate),
            Box::new(add_plugin_data_datetime_field::Migrate),
            Box::new(add_support_upload_files_processor_cursor_key_value_store::Migrate),
            Box::new(add_in_progress_and_error_statuses_sync_message::Migrate),
            Box::new(add_stocktake_edited_activity_log_type::Migrate),
            Box::new(add_received_number_of_packs_to_invoice_line::Migrate),
            Box::new(add_linked_invoice_line_id_to_invoice_line::Migrate),
            Box::new(add_shipment_variance_reason_option_type::Migrate),
            Box::new(add_invoice_received_qty_updated_activity_log_type::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_20_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_19_00::V2_19_00;
        use v2_20_00::V2_20_00;

        let previous_version = V2_19_00.version();
        let version = V2_20_00.version();

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
