use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_activity_log_patient_updated;

pub(crate) struct V2_11_02;

impl Migration for V2_11_02 {
    fn version(&self) -> Version {
        Version::from_str("2.11.2")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(add_activity_log_patient_updated::Migrate)]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_11_02() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_11_00::V2_11_00;
        use v2_11_02::V2_11_02;

        let previous_version = V2_11_00.version();
        let version = V2_11_02.version();

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
}
