use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_store_logo_and_store_preferences_table;
mod add_tetum;
mod drop_item_is_visible_view;

pub(crate) struct V1_01_03;
impl Migration for V1_01_03 {
    fn version(&self) -> Version {
        Version::from_str("1.1.3")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(drop_item_is_visible_view::Migrate),
            Box::new(add_store_logo_and_store_preferences_table::Migrate),
            Box::new(add_tetum::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_03() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_03.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
