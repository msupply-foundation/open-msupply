use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_ancillary_item_table;
mod add_purchase_order_finalise_permission;
mod add_storage_capacity_5c_to_insulated_containers;
mod fix_po_linked_inbound_line_prices;

pub(crate) struct V2_19_00;
impl Migration for V2_19_00 {
    fn version(&self) -> Version {
        Version::from_str("2.19.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_ancillary_item_table::Migrate),
            Box::new(add_purchase_order_finalise_permission::Migrate),
            Box::new(add_storage_capacity_5c_to_insulated_containers::Migrate),
            Box::new(fix_po_linked_inbound_line_prices::Migrate),

        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_19_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_18_00::V2_18_00;
        use v2_19_00::V2_19_00;

        let previous_version = V2_18_00.version();
        let version = V2_19_00.version();

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
