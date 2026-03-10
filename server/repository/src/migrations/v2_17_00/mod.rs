use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_forecasting_fields_to_requisition_line;
mod add_manufacturer_link_id_to_lines;
mod add_purchase_order_id_to_invoice;
mod invoice_line_add_status;
mod item_category_join_add_item_link_id;
mod remove_goods_received;
mod remove_goods_received_cleanup;

pub(crate) struct V2_17_00;
impl Migration for V2_17_00 {
    fn version(&self) -> Version {
        Version::from_str("2.17.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_forecasting_fields_to_requisition_line::Migrate),
            Box::new(remove_goods_received::Migrate),
            Box::new(remove_goods_received_cleanup::Migrate),
            Box::new(add_purchase_order_id_to_invoice::Migrate),
            Box::new(invoice_line_add_status::Migrate),
            Box::new(item_category_join_add_item_link_id::Migrate),
            Box::new(add_manufacturer_link_id_to_lines::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_17_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_16_00::V2_16_00;
        use v2_17_00::V2_17_00;

        let previous_version = V2_16_00.version();
        let version = V2_17_00.version();

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
