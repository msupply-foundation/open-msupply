use super::{Migration, MigrationFragment, version::Version};
use crate::StorageConnection;

mod drop_changelog_dedup_index;
mod requeue_failed_v7_deletes;

pub(crate) struct V3_04_01;

impl Migration for V3_04_01 {
    fn version(&self) -> Version {
        Version::from_str("3.4.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(requeue_failed_v7_deletes::Migrate),
            Box::new(drop_changelog_dedup_index::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_3_04_01() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v3_04_00::V3_04_00;
        use v3_04_01::V3_04_01;

        let previous_version = V3_04_00.version();
        let version = V3_04_01.version();

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
