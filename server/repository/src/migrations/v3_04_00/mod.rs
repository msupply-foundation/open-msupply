use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_line_total_to_purchase_order_line;

pub(crate) struct V3_04_00;

impl Migration for V3_04_00 {
    fn version(&self) -> Version {
        Version::from_str("3.04.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(add_line_total_to_purchase_order_line::Migrate)]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_3_04_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v3_02_00::V3_02_00;
        use v3_04_00::V3_04_00;

        let previous_version = V3_02_00.version();
        let version = V3_04_00.version();

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
