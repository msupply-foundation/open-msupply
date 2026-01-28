use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_custom_data_for_name;

pub(crate) struct V1_05_04;
impl Migration for V1_05_04 {
    fn version(&self) -> Version {
        Version::from_str("1.5.04")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(add_custom_data_for_name::Migrate)]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_05_04() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_05_04.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
