use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_campaign_change_log_table_name;
mod add_campaign_table;
mod add_donor_id_to_invoice_and_invoice_lines;
mod add_doses_columns_to_item_variant;
mod add_initial_stocktake_field;
mod add_view_and_edit_vvm_status_permission;
mod add_vvm_status_id_to_stock_line;
mod add_vvm_status_log_change_log_table_name;
mod add_vvm_status_log_table;
mod add_vvm_status_log_update_to_activity_log;
mod add_vvm_status_table;

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
            Box::new(add_vvm_status_log_table::Migrate),
            Box::new(add_doses_columns_to_item_variant::Migrate),
            Box::new(add_vvm_status_log_change_log_table_name::Migrate),
            Box::new(add_initial_stocktake_field::Migrate),
            Box::new(add_view_and_edit_vvm_status_permission::Migrate),
            Box::new(add_donor_id_to_invoice_and_invoice_lines::Migrate),
            Box::new(add_vvm_status_log_update_to_activity_log::Migrate),
            Box::new(add_vvm_status_id_to_stock_line::Migrate),
            Box::new(add_campaign_table::Migrate),
            Box::new(add_campaign_change_log_table_name::Migrate),
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
