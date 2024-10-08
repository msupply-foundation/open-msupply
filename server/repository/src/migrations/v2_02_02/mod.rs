use super::{version::Version, Migration, MigrationFragment};

use crate::StorageConnection;

mod master_list;
mod master_list_line;

pub(crate) struct V2_02_02;

impl Migration for V2_02_02 {
    fn version(&self) -> Version {
        Version::from_str("2.2.2")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(master_list::Migrate),
            Box::new(master_list_line::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_02_02() {
    use v2_02_01::V2_02_01;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_02_01.version();
    let version = V2_02_02.version();

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
