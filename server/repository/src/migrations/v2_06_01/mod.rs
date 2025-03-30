use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_internal_order_report_type;
mod change_vaccination_date_to_nullable;
mod remove_plugins;

pub(crate) struct V2_06_01;

impl Migration for V2_06_01 {
    fn version(&self) -> Version {
        Version::from_str("2.6.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(change_vaccination_date_to_nullable::Migrate),
            Box::new(remove_plugins::Migrate),
            Box::new(add_internal_order_report_type::Migrate),
            Box::new(remove_plugins::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_06_01() {
    use crate::migrations::v2_06_00::V2_06_00;
    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_06_00.version();
    let version = V2_06_01.version();

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
