use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod relog_changelog_dropped_by_v6_push_filter;

pub(crate) struct V3_01_01;
impl Migration for V3_01_01 {
    fn version(&self) -> Version {
        Version::from_str("3.1.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(relog_changelog_dropped_by_v6_push_filter::Migrate)]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_3_01_01() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v3_00_00::V3_00_00;
        use v3_01_01::V3_01_01;

        let previous_version = V3_00_00.version();
        let version = V3_01_01.version();

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
