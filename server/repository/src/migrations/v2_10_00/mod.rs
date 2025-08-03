use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_contact_table;
mod add_goods_received_table;
mod add_item_store_join;
mod add_program_id_to_stock_and_invoice_lines;
mod add_purchase_order_permission_enum_values;
mod add_purchase_order_report_context;
mod add_purchase_order_tables;
mod add_purchase_order_to_number_type;
mod add_restricted_location_type_id_to_item;
mod add_supplier_discount_percentage_to_purchase_order;
mod delete_unused_number_type;
mod rename_cold_storage_type_to_location_type;

pub(crate) struct V2_10_00;

impl Migration for V2_10_00 {
    fn version(&self) -> Version {
        Version::from_str("2.10.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_contact_table::Migrate),
            Box::new(add_purchase_order_tables::Migrate),
            Box::new(add_purchase_order_to_number_type::Migrate),
            Box::new(add_purchase_order_report_context::Migrate),
            Box::new(add_item_store_join::Migrate),
            Box::new(add_purchase_order_permission_enum_values::Migrate),
            Box::new(rename_cold_storage_type_to_location_type::Migrate),
            Box::new(delete_unused_number_type::Migrate),
            Box::new(add_restricted_location_type_id_to_item::Migrate),
            Box::new(add_goods_received_table::Migrate),
            Box::new(add_supplier_discount_percentage_to_purchase_order::Migrate),
            Box::new(add_program_id_to_stock_and_invoice_lines::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {

    #[actix_rt::test]
    async fn migration_2_10_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_09_00::V2_09_00;
        use v2_10_00::V2_10_00;

        let previous_version = V2_09_00.version();
        let version = V2_10_00.version();

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
