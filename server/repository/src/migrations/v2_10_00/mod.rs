use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod non_nullable_item_in_purchase_order_line;
pub(crate) struct V2_10_00;

impl Migration for V2_10_00 {
    fn version(&self) -> Version {
        Version::from_str("2.10.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(non_nullable_item_in_purchase_order_line::Migrate)]
    }
}
