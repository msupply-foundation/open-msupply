use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod store_reintegrate_for_created_date;

pub(crate) struct V2_06_02;

impl Migration for V2_06_02 {
    fn version(&self) -> Version {
        Version::from_str("2.6.2")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(store_reintegrate_for_created_date::Migrate)]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_06_02() {
    use crate::migrations::v2_06_00::V2_06_00;
    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_06_00.version();
    let version = V2_06_02.version();

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
