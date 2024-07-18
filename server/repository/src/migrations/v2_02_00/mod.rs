use super::{version::Version, Migration};

use crate::StorageConnection;

mod create_missing_master_list_and_program;
mod create_system_user;
mod report_add_report_context;
mod rnr_form;
mod store_preferences_for_reports;

pub(crate) struct V2_02_00;

impl Migration for V2_02_00 {
    fn version(&self) -> Version {
        Version::from_str("2.2.0")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        create_missing_master_list_and_program::migrate(connection)?;
        create_system_user::migrate(connection)?;
        store_preferences_for_reports::migrate(connection)?;
        rnr_form::migrate(connection)?;
        report_add_report_context::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_02_00() {
    use v2_01_00::V2_01_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_01_00.version();
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
