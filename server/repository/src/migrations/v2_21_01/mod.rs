use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod backfill_stock_relocation_repack_invoices;

pub(crate) struct V2_21_01;
impl Migration for V2_21_01 {
    fn version(&self) -> Version {
        Version::from_str("2.21.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(backfill_stock_relocation_repack_invoices::Migrate)]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_21_01() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_21_00::V2_21_00;
        use v2_21_01::V2_21_01;

        let previous_version = V2_21_00.version();
        let version = V2_21_01.version();

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
