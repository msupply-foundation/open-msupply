use super::{version::Version, Migration, MigrationFragment};

mod add_create_invoice_from_requisition_permission;
mod add_index_to_sync_buffer;
mod add_invoice_line_prescribed_quantity;
mod add_program_deleted_datetime;
mod backend_plugins;
use crate::StorageConnection;

pub(crate) struct V2_06_00;

impl Migration for V2_06_00 {
    fn version(&self) -> Version {
        Version::from_str("2.6.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_index_to_sync_buffer::Migrate),
            Box::new(add_invoice_line_prescribed_quantity::Migrate),
            Box::new(add_program_deleted_datetime::Migrate),
            Box::new(backend_plugins::Migrate),
            Box::new(add_create_invoice_from_requisition_permission::Migrate)
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_06_00() {
    use v2_05_00::V2_05_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_05_00.version();
    let version = V2_06_00.version();

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
