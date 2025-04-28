use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_donor_id_to_invoice_and_invoice_lines;
pub(crate) struct V2_08_00;

impl Migration for V2_08_00 {
    fn version(&self) -> Version {
        Version::from_str("2.7.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(add_donor_id_to_invoice_and_invoice_lines::Migrate)]
    }
}
