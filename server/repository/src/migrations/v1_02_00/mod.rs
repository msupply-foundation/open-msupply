use super::{version::Version, Migration};

use crate::StorageConnection;
mod context_table;
mod log_settings;
pub(crate) struct V1_02_00;

impl Migration for V1_02_00 {
    fn version(&self) -> Version {
        Version::from_str("1.2.00")
    }

    fn migrate(&self, connection: &mut StorageConnection) -> anyhow::Result<()> {
        log_settings::migrate(connection)?;
        context_table::migrate(connection)?;
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
    let SetupResult { mut connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&mut connection), version);
}
