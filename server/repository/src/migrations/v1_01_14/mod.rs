use super::{version::Version, Migration};

mod barcode_changelog;
mod is_sync_update;

use crate::StorageConnection;
pub(crate) struct V1_01_14;

impl Migration for V1_01_14 {
    fn version(&self) -> Version {
        Version::from_str("1.1.14")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        is_sync_update::migrate(connection)?;
        barcode_changelog::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_14() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_14.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
