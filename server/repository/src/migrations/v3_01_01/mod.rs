use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_prescription_order_activity_log_types;
mod add_prescription_order_id_to_invoice;
mod add_prescription_order_status_processor_cursor_pg_enum;
mod add_prescription_order_tables;
mod seed_prescription_order_status_processor_cursor;

pub(crate) struct V3_01_01;

impl Migration for V3_01_01 {
    fn version(&self) -> Version {
        Version::from_str("3.01.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_prescription_order_tables::Migrate),
            Box::new(add_prescription_order_id_to_invoice::Migrate),
            Box::new(add_prescription_order_status_processor_cursor_pg_enum::Migrate),
            Box::new(seed_prescription_order_status_processor_cursor::Migrate),
            Box::new(add_prescription_order_activity_log_types::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_3_01_01() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v3_00_00::V3_00_00;
        use v3_01_01::V3_01_01;

        let previous_version = V3_00_00.version();
        let version = V3_01_01.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // Run this migration
        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(get_database_version(&connection), version);
    }
}
