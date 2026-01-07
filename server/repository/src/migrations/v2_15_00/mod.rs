use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod remove_skip_immediate_statuses_in_outbound_pref;
mod sync_v7;

pub(crate) struct V2_15_00;
impl Migration for V2_15_00 {
    fn version(&self) -> Version {
        Version::from_str("2.15.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(remove_skip_immediate_statuses_in_outbound_pref::Migrate),
            Box::new(sync_v7::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_15_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_13_00::V2_13_00;
        use v2_15_00::V2_15_00;

        let previous_version = V2_13_00.version();
        let version = V2_15_00.version();

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
