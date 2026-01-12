use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod activity_log;
mod cold_chain;
mod permissions_preferences;
mod sensor;

pub(crate) struct V1_05_00;
impl Migration for V1_05_00 {
    fn version(&self) -> Version {
        Version::from_str("1.5.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(permissions_preferences::Migrate),
            Box::new(activity_log::Migrate),
            Box::new(sensor::Migrate),
            Box::new(cold_chain::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_05_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_05_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
