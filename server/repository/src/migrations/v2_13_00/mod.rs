use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_created_from_req_ids_to_requisition;
mod add_margin_to_item_store_join;
mod add_master_list_to_changelog;

pub(crate) struct V2_13_00;
impl Migration for V2_13_00 {
    fn version(&self) -> Version {
        Version::from_str("2.13.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_created_from_req_ids_to_requisition::Migrate),
            Box::new(add_master_list_to_changelog::Migrate),
            Box::new(add_margin_to_item_store_join::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_13_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_12_00::V2_12_00;
        use v2_13_00::V2_13_00;

        let previous_version = V2_12_00.version();
        let version = V2_13_00.version();

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
