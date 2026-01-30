use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod invoice_received_status;
mod update_invoice_received_status;

pub(crate) struct V2_08_03;

impl Migration for V2_08_03 {
    fn version(&self) -> Version {
        Version::from_str("2.8.3")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(invoice_received_status::Migrate),
            Box::new(update_invoice_received_status::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {

    #[actix_rt::test]
    async fn migration_2_08_03() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_08_00::V2_08_00;
        use v2_08_03::V2_08_03;

        let previous_version = V2_08_00.version();
        let version = V2_08_03.version();

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
