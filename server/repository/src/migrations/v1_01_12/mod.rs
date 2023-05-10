use super::{version::Version, Migration};

mod location_movement_triggers;

use crate::StorageConnection;
pub(crate) struct V1_01_12;

impl Migration for V1_01_12 {
    fn version(&self) -> Version {
        Version::from_str("1.1.12")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        location_movement_triggers::migrate(connection)?;
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
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
