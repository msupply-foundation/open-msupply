use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_changelog_default_partition;
mod add_database_error_to_system_log_type_enum;
mod add_settings_sync_is_paused_key_type;
mod add_sync_pause_changed_system_log_type;

pub(crate) struct V3_03_00;

impl Migration for V3_03_00 {
    fn version(&self) -> Version {
        Version::from_str("3.03.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_database_error_to_system_log_type_enum::Migrate),
            Box::new(add_changelog_default_partition::Migrate),
            Box::new(add_settings_sync_is_paused_key_type::Migrate),
            Box::new(add_sync_pause_changed_system_log_type::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_3_03_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v3_02_00::V3_02_00;
        use v3_03_00::V3_03_00;

        let previous_version = V3_02_00.version();
        let version = V3_03_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // Run this migration
        migrate(&connection, Some(version.clone()), MigrationConfig::default()).unwrap();
        assert_eq!(get_database_version(&connection), version);
    }
}
