use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

pub(crate) struct V2_17_00;
impl Migration for V2_17_00 {
    fn version(&self) -> Version {
        Version::from_str("2.17.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            // Add migration fragments here
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_17_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_16_00::V2_16_00;
        use v2_17_00::V2_17_00;

        let previous_version = V2_16_00.version();
        let version = V2_17_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);
    }
}
