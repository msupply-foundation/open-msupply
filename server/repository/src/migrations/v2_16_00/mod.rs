use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_log_tag_sensor_type;
mod add_migration_and_server_status_to_system_log_type_enums;
mod add_shipping_method_id_to_invoice;
mod add_version_to_plugins;
mod invoice_line_add_status;

pub(crate) struct V2_16_00;
impl Migration for V2_16_00 {
    fn version(&self) -> Version {
        Version::from_str("2.16.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_log_tag_sensor_type::Migrate),
            Box::new(add_migration_and_server_status_to_system_log_type_enums::Migrate),
            Box::new(add_shipping_method_id_to_invoice::Migrate),
            Box::new(add_version_to_plugins::Migrate),
            Box::new(invoice_line_add_status::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_16_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_15_00::V2_15_00;
        use v2_16_00::V2_16_00;

        let previous_version = V2_15_00.version();
        let version = V2_16_00.version();

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
