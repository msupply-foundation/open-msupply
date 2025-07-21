use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_can_cancel_finalised_invoices_user_permission;
mod add_contact_table;
mod add_goods_receiving_table;
mod add_purchase_order_report_context;
mod add_purchase_order_tables;
mod add_purchase_order_to_number_type;

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
            Box::new(add_can_cancel_finalised_invoices_user_permission::Migrate),
            Box::new(add_goods_receiving_table::Migrate),
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
