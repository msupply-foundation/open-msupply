use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_ignore_for_orders_to_item_store_join;
mod add_permission_to_verify_inbound_shipment;
mod update_goods_received_report_context;

pub(crate) struct V2_11_00;

impl Migration for V2_11_00 {
    fn version(&self) -> Version {
        Version::from_str("2.11.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_permission_to_verify_inbound_shipment::Migrate),
            Box::new(update_goods_received_report_context::Migrate),
            Box::new(add_ignore_for_orders_to_item_store_join::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {

    #[actix_rt::test]
    async fn migration_2_11_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_10_00::V2_10_00;
        use v2_11_00::V2_11_00;

        let previous_version = V2_10_00.version();
        let version = V2_11_00.version();

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
