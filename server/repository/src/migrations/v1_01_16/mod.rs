use super::{version::Version, Migration};

use crate::StorageConnection;
mod key_value_store_update;

pub(crate) struct V1_01_16;

impl Migration for V1_01_16 {
    fn version(&self) -> Version {
        Version::from_str("1.1.16")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        key_value_store_update::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_16() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_16.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
