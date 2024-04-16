use super::{version::Version, Migration};

use crate::StorageConnection;

mod activity_log;
mod cold_chain;
mod permissions_preferences;
mod sensor;
pub(crate) struct V1_05_00;

impl Migration for V1_05_00 {
    fn version(&self) -> Version {
        Version::from_str("1.5.0")
    }

    fn migrate(&self, connection: &mut StorageConnection) -> anyhow::Result<()> {
        permissions_preferences::migrate(connection)?;
        activity_log::migrate(connection)?;
        sensor::migrate(connection)?;
        cold_chain::migrate(connection)?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_05_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_05_00.version();

    // This test allows checking sql syntax
    let SetupResult { mut connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&mut connection), version);
}
