use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_database_version_to_key_type;

pub(crate) struct V1_00_04;
impl Migration for V1_00_04 {
    fn version(&self) -> Version {
        Version::from_str("1.0.4")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(add_database_version_to_key_type::Migrate)]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_00_04() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_00_04.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
