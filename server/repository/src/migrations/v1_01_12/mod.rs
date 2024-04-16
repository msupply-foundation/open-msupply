use super::{version::Version, Migration};

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

    fn migrate(&self, connection: &mut StorageConnection) -> anyhow::Result<()> {
        location_movement_triggers::migrate(connection)?;
        stock_line_barcode_id::migrate(connection)?;
        local_authorisation::migrate(connection)?;
        barcode_sync::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_12() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_12.version();

    // This test allows checking sql syntax
    let SetupResult { mut connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&mut connection), version);
}
