// Test commit to trigger CI workflow — safe to revert
use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod reintegrate_goods_received;

pub(crate) struct V2_17_03;
impl Migration for V2_17_03 {
    fn version(&self) -> Version {
        Version::from_str("2.17.3")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(reintegrate_goods_received::Migrate)]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_17_03() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_17_00::V2_17_00;
        use v2_17_03::V2_17_03;

        let previous_version = V2_17_00.version();
        let version = V2_17_03.version();

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
