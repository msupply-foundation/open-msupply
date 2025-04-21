use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod doses_field_on_stock_line;
pub(crate) struct V2_08_00;

impl Migration for V2_08_00 {
    fn version(&self) -> Version {
        Version::from_str("2.8.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(doses_field_on_stock_line::Migrate)]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_08_00() {
    use v2_07_00::V2_07_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_07_00.version();
    let version = V2_08_00.version();

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
