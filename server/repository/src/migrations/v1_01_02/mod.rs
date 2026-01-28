use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_supplier_id_to_stock_line;
mod inventory_adjustment;

pub(crate) struct V1_01_02;
impl Migration for V1_01_02 {
    fn version(&self) -> Version {
        Version::from_str("1.1.2")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_supplier_id_to_stock_line::Migrate),
            Box::new(inventory_adjustment::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_02() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_02.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
