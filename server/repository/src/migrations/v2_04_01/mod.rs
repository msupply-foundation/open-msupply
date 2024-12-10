use super::{version::Version, Migration, MigrationFragment};

mod category_and_item_categories;
mod system_log_table;

use crate::StorageConnection;

pub(crate) struct V2_04_01;

impl Migration for V2_04_01 {
    fn version(&self) -> Version {
        Version::from_str("2.4.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(category_and_item_categories::Migrate),
            Box::new(system_log_table::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_04_01() {
    use v2_04_00::V2_04_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_04_00.version();
    let version = V2_04_01.version();

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
