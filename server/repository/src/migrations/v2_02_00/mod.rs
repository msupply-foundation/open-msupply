use super::{version::Version, Migration};

use crate::StorageConnection;

mod add_asset_internal_location_changelog;
mod remove_changelog_triggers;

pub(crate) struct V2_02_00;

impl Migration for V2_02_00 {
    fn version(&self) -> Version {
        Version::from_str("2.2.0")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        add_asset_internal_location_changelog::migrate(connection)?;
        remove_changelog_triggers::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_02_00() {
    use v2_00_00::V2_00_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_00_00.version();
    let version = V2_02_00.version();

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
