use super::{version::Version, Migration};

use crate::StorageConnection;

mod assets;
mod ledger;
mod pg_enums;
mod v6_sync_api_error_code;
mod vaccine_course;

pub(crate) struct V2_01_00;

impl Migration for V2_01_00 {
    fn version(&self) -> Version {
        Version::from_str("2.1.0")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        ledger::migrate(connection)?;
        pg_enums::migrate(connection)?;
        assets::migrate_assets(connection)?;
        v6_sync_api_error_code::migrate(connection)?;
        vaccine_course::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_01_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V2_01_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
