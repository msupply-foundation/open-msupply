use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_sync_translation_fk_error_to_system_log_type_enums;
mod invoice_datetime_indexes;

pub(crate) struct V2_17_05;
impl Migration for V2_17_05 {
    fn version(&self) -> Version {
        Version::from_str("2.17.5")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_sync_translation_fk_error_to_system_log_type_enums::Migrate),
            Box::new(invoice_datetime_indexes::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_17_05() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_17_03::V2_17_03;
        use v2_17_05::V2_17_05;

        let previous_version = V2_17_03.version();
        let version = V2_17_05.version();

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
