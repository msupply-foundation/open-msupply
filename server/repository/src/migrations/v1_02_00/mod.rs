use super::{version::Version, Migration, MigrationFragment};

use crate::StorageConnection;
mod context_table;
mod log_settings;
pub(crate) struct V1_02_00;

impl Migration for V1_02_00 {
    fn version(&self) -> Version {
        Version::from_str("1.2.00")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(log_settings::Migrate),
            Box::new(context_table::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_02_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_02_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
