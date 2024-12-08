use super::{version::Version, Migration, MigrationFragment};

mod add_emergency_orders;
mod new_store_preferences;

use crate::StorageConnection;

pub(crate) struct V2_05_00;

impl Migration for V2_05_00 {
    fn version(&self) -> Version {
        Version::from_str("2.5.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(new_store_preferences::Migrate),
            Box::new(add_emergency_orders::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_05_00() {
    use v2_04_00::V2_04_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_04_00.version();
    let version = V2_05_00.version();

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