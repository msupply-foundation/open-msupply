use super::{version::Version, Migration};

use crate::StorageConnection;

mod activity_log;
mod assets;
mod decimal_pack_size;
mod decimal_requisition_quantities;
mod demographics;
mod ledger;
mod name_properties;
mod pg_enums;
mod program;
mod property;
mod store_add_name_link_id;
mod v6_sync_api_error_code;
mod vaccine_course;

pub(crate) struct V2_01_00;

impl Migration for V2_01_00 {
    fn version(&self) -> Version {
        Version::from_str("2.1.0")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Note, this migration deletes the consumption view which is recreated in decimal_pack_size
        // migration, i.e. this migration has to run first.
        store_add_name_link_id::migrate(connection)?;
        activity_log::migrate(connection)?;
        // The ledger is migrated in decimal_pack_size because the same views needed to be
        // re-created
        // ledger::migrate(connection)?;
        pg_enums::migrate(connection)?;
        decimal_pack_size::migrate(connection)?;
        decimal_requisition_quantities::migrate(connection)?;
        assets::migrate_assets(connection)?;
        v6_sync_api_error_code::migrate(connection)?;
        property::migrate(connection)?;
        name_properties::migrate_name_properties(connection)?;
        demographics::migrate(connection)?;
        vaccine_course::migrate(connection)?;
        program::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_01_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V2_01_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
