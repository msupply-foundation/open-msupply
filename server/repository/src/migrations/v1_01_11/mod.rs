use super::{version::Version, Migration};
mod activity_log;
mod barcode;
mod is_sync_updated_for_requisition;
mod name_tags;
mod period_and_period_schedule;
mod program_requisition;
mod remote_authorisation;
mod requisition;
mod store_preference;

use crate::StorageConnection;
pub(crate) struct V1_01_11;

impl Migration for V1_01_11 {
    fn version(&self) -> Version {
        Version::from_str("1.1.11")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        activity_log::migrate(connection)?;
        store_preference::migrate(connection)?;
        name_tags::migrate(connection)?;
        period_and_period_schedule::migrate(connection)?;
        program_requisition::migrate(connection)?;

        // Remote authorisation
        remote_authorisation::migrate(connection)?;
        is_sync_updated_for_requisition::migrate(connection)?;
        requisition::migrate(connection)?;

        barcode::migrate(connection)?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_11() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_11.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
