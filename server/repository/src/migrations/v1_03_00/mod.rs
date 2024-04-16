use super::{version::Version, Migration};

use crate::StorageConnection;
pub(crate) struct V1_03_00;
mod user;

impl Migration for V1_03_00 {
    fn version(&self) -> Version {
        Version::from_str("1.3.0")
    }

    fn migrate(&self, connection: &mut StorageConnection) -> anyhow::Result<()> {
        user::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_03_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_03_00.version();

    // This test allows checking sql syntax
    let SetupResult { mut connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&mut connection), version);
}
