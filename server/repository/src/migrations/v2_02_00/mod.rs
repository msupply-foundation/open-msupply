use super::{version::Version, Migration, MigrationContext};

use crate::StorageConnection;

mod add_asset_internal_location_changelog;
mod consumption_and_replenishment_views;
mod create_missing_master_list_and_program;
mod create_system_user;
mod item_ven;
mod remove_changelog_triggers;
mod report_add_report_context;
mod rnr_form;
mod store_preferences_for_reports;
mod sync;

pub(crate) struct V2_02_00;

impl Migration for V2_02_00 {
    fn version(&self) -> Version {
        Version::from_str("2.2.0")
    }

    fn migrate_pre_release(
        &self,
        _connection: &StorageConnection,
        ctx: &MigrationContext,
    ) -> anyhow::Result<()> {
        if ctx.database_version.pre_release == Some("RC1".to_string()) {
            // fix_rc1::migrate(connection)?;
        }

        Ok(()) // RC migration is allowed for any version return error here to block the rc migration running
    }

    fn migrate_with_context(
        &self,
        connection: &StorageConnection,
        ctx: &MigrationContext,
    ) -> anyhow::Result<()> {
        // Any migrations that can be re-run safely
        add_asset_internal_location_changelog::migrate(connection)?;
        remove_changelog_triggers::migrate(connection)?;
        create_missing_master_list_and_program::migrate(connection)?;
        create_system_user::migrate(connection)?;
        report_add_report_context::migrate(connection)?;

        // Any migrations that should already be applied in the previous version will be skipped
        if !ctx.database_version.is_equivalent(&self.version()) {
            rnr_form::migrate(connection)?;
            store_preferences_for_reports::migrate(connection)?;
            item_ven::migrate(connection)?;
            sync::migrate(connection)?;
        }
        consumption_and_replenishment_views::migrate(connection)?;

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
