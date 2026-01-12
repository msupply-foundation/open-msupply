use super::{version::Version, Migration, MigrationFragment};

mod barcode_sync;
mod local_authorisation;
mod location_movement_triggers;
mod stock_line_barcode_id;

use crate::StorageConnection;
pub(crate) struct V1_01_12;

impl Migration for V1_01_12 {
    fn version(&self) -> Version {
        Version::from_str("1.1.12")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(location_movement_triggers::Migrate),
            Box::new(stock_line_barcode_id::Migrate),
            Box::new(local_authorisation::Migrate),
            Box::new(barcode_sync::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_12() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_12.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
