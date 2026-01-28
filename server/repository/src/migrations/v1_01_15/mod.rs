use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod repack_activity_log;
mod repack_report;

pub(crate) struct V1_01_15;
impl Migration for V1_01_15 {
    fn version(&self) -> Version {
        Version::from_str("1.1.15")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(repack_report::Migrate),
            Box::new(repack_activity_log::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_15() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_15.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
