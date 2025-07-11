use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_can_cancel_finalised_invoices_user_permission;
mod add_excel_template_to_report;
mod add_mutate_clinician_permission;
mod add_purchase_order_report_context;
mod add_purchase_order_tables;
mod add_purchase_order_to_number_type;
mod add_shipped_number_of_packs_to_invoice_line;
mod add_store_id_to_clinician;
mod extend_name_table_fields;
mod process_clinician_store_join_deletes;
mod remove_item_variant_doses_column;
mod resync_existing_vaccination_records;
mod resync_existing_vaccine_course_dose_and_item;
mod resync_existing_vaccine_course_records;
pub(crate) struct V2_09_00;

impl Migration for V2_09_00 {
    fn version(&self) -> Version {
        Version::from_str("2.9.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(process_clinician_store_join_deletes::Migrate),
            Box::new(process_clinician_store_join_deletes::Migrate),
            Box::new(add_mutate_clinician_permission::Migrate),
            Box::new(add_store_id_to_clinician::Migrate),
            Box::new(add_purchase_order_tables::Migrate),
            Box::new(extend_name_table_fields::Migrate),
            Box::new(resync_existing_vaccine_course_records::Migrate),
            Box::new(resync_existing_vaccine_course_dose_and_item::Migrate),
            Box::new(add_purchase_order_to_number_type::Migrate),
            Box::new(add_shipped_number_of_packs_to_invoice_line::Migrate),
            Box::new(add_excel_template_to_report::Migrate),
            Box::new(add_purchase_order_report_context::Migrate),
            Box::new(resync_existing_vaccination_records::Migrate),
            Box::new(add_can_cancel_finalised_invoices_user_permission::Migrate),
            Box::new(remove_item_variant_doses_column::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {

    #[actix_rt::test]
    async fn migration_2_09_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_08_00::V2_08_00;
        use v2_09_00::V2_09_00;

        let previous_version = V2_08_00.version();
        let version = V2_09_00.version();

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
