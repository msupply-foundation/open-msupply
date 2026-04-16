use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_base_population_to_demographic_projection;
mod alter_changelog_table_for_sync_v7;

pub(crate) struct V2_18_00;
impl Migration for V2_18_00 {
    fn version(&self) -> Version {
        Version::from_str("2.18.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_base_population_to_demographic_projection::Migrate),
            Box::new(alter_changelog_table_for_sync_v7::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_18_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_17_00::V2_17_00;
        use v2_18_00::V2_18_00;

        let previous_version = V2_17_00.version();
        let version = V2_18_00.version();

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
}
