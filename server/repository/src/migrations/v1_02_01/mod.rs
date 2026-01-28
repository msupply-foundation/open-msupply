use super::{version::Version, Migration, MigrationFragment};

use crate::StorageConnection;
pub(crate) struct V1_02_01;
mod activity_log;
mod invoice;
mod number_and_permission_type;
mod store_preference;

impl Migration for V1_02_01 {
    fn version(&self) -> Version {
        Version::from_str("1.2.01")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(activity_log::Migrate),
            Box::new(invoice::Migrate),
            Box::new(number_and_permission_type::Migrate),
            Box::new(store_preference::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_02_01() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_02_01.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
