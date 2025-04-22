use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_central_patient_visibility_processor_pg_enum_type;
mod add_expected_delivery_date_to_invoice;
mod add_given_store_id_to_vaccination;
mod add_item_warning_join_table;
mod add_linked_invoice_id_to_invoice_line;
mod add_patient_link_id_to_vaccination;
mod add_preference_table;
mod add_warning_table;
mod asset_data_matrix_locked_fields;
mod asset_data_matrix_permission;
mod change_vaccination_date_to_not_nullable;
mod new_stocktake_fields;
mod remove_encounter_clinician_constraint;
mod trigger_patient_visibility_sync;
pub(crate) struct V2_07_00;

impl Migration for V2_07_00 {
    fn version(&self) -> Version {
        Version::from_str("2.7.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_preference_table::Migrate),
            Box::new(add_linked_invoice_id_to_invoice_line::Migrate),
            Box::new(add_expected_delivery_date_to_invoice::Migrate),
            Box::new(new_stocktake_fields::Migrate),
            Box::new(asset_data_matrix_permission::Migrate),
            Box::new(asset_data_matrix_locked_fields::Migrate),
            Box::new(add_patient_link_id_to_vaccination::Migrate),
            Box::new(change_vaccination_date_to_not_nullable::Migrate),
            Box::new(remove_encounter_clinician_constraint::Migrate),
            Box::new(add_warning_table::Migrate),
            Box::new(add_item_warning_join_table::Migrate),
            Box::new(add_given_store_id_to_vaccination::Migrate),
            Box::new(trigger_patient_visibility_sync::Migrate),
            Box::new(add_central_patient_visibility_processor_pg_enum_type::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_07_00() {
    use v2_06_00::V2_06_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_06_00.version();
    let version = V2_07_00.version();

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
