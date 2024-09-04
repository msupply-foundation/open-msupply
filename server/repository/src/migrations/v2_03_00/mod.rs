use super::{version::Version, Migration};

use crate::StorageConnection;

pub(crate) struct V2_03_00;

impl Migration for V2_03_00 {
    fn version(&self) -> Version {
        Version::from_str("2.3.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_03_00() {
    use v2_02_02::V2_02_02;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_02_02.version();
    let version = V2_03_00.version();

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
