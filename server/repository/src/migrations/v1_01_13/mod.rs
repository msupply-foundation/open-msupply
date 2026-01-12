use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod invoice_and_number_type;
mod permission;

pub(crate) struct V1_01_13;
impl Migration for V1_01_13 {
    fn version(&self) -> Version {
        Version::from_str("1.1.13")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(permission::Migrate),
            Box::new(invoice_and_number_type::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_13() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_13.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
