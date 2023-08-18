use super::{version::Version, Migration};

use crate::StorageConnection;
mod invoice;
mod log_settings;
mod number_and_permission_type;
mod sensor;
mod store_preference;
pub(crate) struct V1_02_00;

impl Migration for V1_02_00 {
    fn version(&self) -> Version {
        Version::from_str("1.2.00")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        log_settings::migrate(connection)?;
        invoice::migrate(connection)?;
        number_and_permission_type::migrate(connection)?;
        store_preference::migrate(connection)?;
        sensor::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_02_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_02_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
