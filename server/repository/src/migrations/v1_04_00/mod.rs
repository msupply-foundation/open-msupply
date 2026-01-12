use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod activity_log;
mod contact_trace;
mod date_of_death;

pub(crate) struct V1_04_00;
impl Migration for V1_04_00 {
    fn version(&self) -> Version {
        Version::from_str("1.4.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(contact_trace::Migrate),
            Box::new(date_of_death::Migrate),
            Box::new(activity_log::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_04_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_04_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
