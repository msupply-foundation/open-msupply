use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_store_name_link_id_index;

pub(crate) struct V3_03_01;

impl Migration for V3_03_01 {
    fn version(&self) -> Version {
        Version::from_str("3.3.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(add_store_name_link_id_index::Migrate)]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_3_03_01() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v3_02_00::V3_02_00;
        use v3_03_01::V3_03_01;

        let previous_version = V3_02_00.version();
        let version = V3_03_01.version();

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
