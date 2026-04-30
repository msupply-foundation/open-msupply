use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_encounter_changelog_table_name;
mod requisition_line_add_price_per_unit;
mod resync_existing_vaccination_encounter_records;

pub(crate) struct V2_14_00;
impl Migration for V2_14_00 {
    fn version(&self) -> Version {
        Version::from_str("2.14.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_encounter_changelog_table_name::Migrate),
            Box::new(requisition_line_add_price_per_unit::Migrate),
            Box::new(resync_existing_vaccination_encounter_records::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_14_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_13_00::V2_13_00;
        use v2_14_00::V2_14_00;

        let previous_version = V2_13_00.version();
        let version = V2_14_00.version();

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
