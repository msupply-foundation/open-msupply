use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_cancelled_status_to_invoice;
mod add_create_invoice_from_requisition_permission;
mod add_form_schema_sync;
mod add_index_to_sync_buffer;
mod add_insurance_fields_to_invoice;
mod add_insurance_provider;
mod add_invoice_line_prescribed_quantity;
mod add_load_plugin_processor_pg_enum_type;
mod add_name_insurance_join;
mod add_name_next_of_kin_id;
mod add_name_next_of_kin_name;
mod add_program_deleted_datetime;
mod add_program_id_on_stocktake;
mod add_program_id_to_invoice;
mod add_report_sync;
mod backend_plugins;
mod drop_legacy_reports;
mod prescribed_quantity_store_pref;
mod printer_create_table;
mod reinitialise_reports;

pub(crate) struct V2_06_00;

impl Migration for V2_06_00 {
    fn version(&self) -> Version {
        Version::from_str("2.6.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_index_to_sync_buffer::Migrate),
            Box::new(add_invoice_line_prescribed_quantity::Migrate),
            Box::new(add_program_deleted_datetime::Migrate),
            Box::new(backend_plugins::Migrate),
            Box::new(add_create_invoice_from_requisition_permission::Migrate),
            Box::new(add_name_next_of_kin_id::Migrate),
            Box::new(add_load_plugin_processor_pg_enum_type::Migrate),
            Box::new(add_program_id_to_invoice::Migrate),
            Box::new(add_insurance_provider::Migrate),
            Box::new(prescribed_quantity_store_pref::Migrate),
            Box::new(add_name_next_of_kin_name::Migrate),
            Box::new(add_program_id_on_stocktake::Migrate),
            Box::new(add_name_insurance_join::Migrate),
            Box::new(printer_create_table::Migrate),
            Box::new(add_insurance_fields_to_invoice::Migrate),
            Box::new(add_cancelled_status_to_invoice::Migrate),
            Box::new(drop_legacy_reports::Migrate),
            Box::new(reinitialise_reports::Migrate),
            Box::new(add_report_sync::Migrate),
            Box::new(add_form_schema_sync::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_06_00() {
    use v2_05_00::V2_05_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_05_00.version();
    let version = V2_06_00.version();

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
