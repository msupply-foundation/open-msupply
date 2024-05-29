use super::{version::Version, Migration};

use crate::StorageConnection;

mod central_omsupply;

pub(crate) struct V3_00_00;

impl Migration for V3_00_00 {
    fn version(&self) -> Version {
        Version::from_str("3.0.0")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        central_omsupply::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_3_00_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V3_00_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
