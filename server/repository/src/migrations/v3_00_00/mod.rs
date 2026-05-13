use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_merge_sync_message_processor_cursor_pg_enum;
mod add_site_sync_version;
mod add_sync_log_v7;
mod add_sync_log_v7_reference;
mod add_sync_request;
mod add_sync_v7_cursor_pg_enum;
mod add_sync_v7_token_pg_enum;
mod add_sync_version;
mod add_v7_upgrade_failed_error_code;
mod alter_changelog_table_for_sync_v7;
mod alter_sqlite_changelog_table_for_syncv7;
mod alter_sync_buffer_for_sync_v7;
mod create_changelog_indexes;
mod create_site_table;
mod partition_changelog_by_cursor;
mod populate_changelog_with_rows_for_sync_v7_tables;
mod populate_sync_version;
mod rebuild_sync_buffer;
mod seed_sync_request_self_resync;
mod update_changelog_for_sync_v7;

pub(crate) struct V3_00_00;
impl Migration for V3_00_00 {
    fn version(&self) -> Version {
        Version::from_str("3.00.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_sync_v7_cursor_pg_enum::Migrate),
            Box::new(add_sync_v7_token_pg_enum::Migrate),
            Box::new(add_sync_version::Migrate),
            Box::new(populate_sync_version::Migrate),
            Box::new(add_v7_upgrade_failed_error_code::Migrate),
            Box::new(alter_changelog_table_for_sync_v7::Migrate),
            Box::new(alter_sync_buffer_for_sync_v7::Migrate),
            Box::new(add_sync_log_v7::Migrate),
            Box::new(update_changelog_for_sync_v7::Migrate),
            Box::new(create_site_table::Migrate),
            Box::new(add_site_sync_version::Migrate),
            Box::new(rebuild_sync_buffer::Migrate),
            Box::new(seed_sync_request_self_resync::Migrate),
            Box::new(alter_sqlite_changelog_table_for_syncv7::Migrate),
            Box::new(partition_changelog_by_cursor::Migrate),
            Box::new(populate_changelog_with_rows_for_sync_v7_tables::Migrate),
            Box::new(add_merge_sync_message_processor_cursor_pg_enum::Migrate),
            Box::new(create_changelog_indexes::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_3_00_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_18_00::V2_18_00;
        use v3_00_00::V3_00_00;

        let previous_version = V2_18_00.version();
        let version = V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // Run this migration
        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(get_database_version(&connection), version);
    }
}
