use super::{version::Version, Migration, MigrationFragment};
mod activity_log;
mod barcode;
mod is_sync_updated_for_requisition;
mod name_tags;
mod period_and_period_schedule;
mod program_requisition;
mod remote_authorisation;
mod requisition;
mod store_preference;

use crate::StorageConnection;

pub(crate) struct V1_01_11;
impl Migration for V1_01_11 {
    fn version(&self) -> Version {
        Version::from_str("1.1.11")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(activity_log::Migrate),
            Box::new(store_preference::Migrate),
            Box::new(name_tags::Migrate),
            Box::new(period_and_period_schedule::Migrate),
            Box::new(program_requisition::Migrate),
            Box::new(remote_authorisation::Migrate),
            Box::new(is_sync_updated_for_requisition::Migrate),
            Box::new(requisition::Migrate),
            Box::new(barcode::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_11() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_11.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
