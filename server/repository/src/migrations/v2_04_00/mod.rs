use super::{version::Version, Migration, MigrationFragment};

mod add_expected_lifespan_to_assets;
mod add_reason_option_table;
mod add_temperature_range_table;
mod add_unserviceable_status_to_asset_status_enum;

use crate::StorageConnection;

pub(crate) struct V2_04_00;

impl Migration for V2_04_00 {
    fn version(&self) -> Version {
        Version::from_str("2.4.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_reason_option_table::Migrate),
            Box::new(add_unserviceable_status_to_asset_status_enum::Migrate),
            Box::new(add_expected_lifespan_to_assets::Migrate),
            Box::new(add_temperature_range_table::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_04_00() {
    use v2_03_00::V2_03_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_03_00.version();
    let version = V2_04_00.version();

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
