use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod create_dynamic_cursor_key;
mod create_plugin_user;
mod create_sync_message_table;

pub(crate) struct V2_07_04;

impl Migration for V2_07_04 {
    fn version(&self) -> Version {
        Version::from_str("2.7.4")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(create_dynamic_cursor_key::Migrate),
            Box::new(create_sync_message_table::Migrate),
            Box::new(create_plugin_user::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_07_04() {
    use crate::migrations::v2_07_00::V2_07_00;
    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_07_00.version();
    let version = V2_07_04.version();

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
