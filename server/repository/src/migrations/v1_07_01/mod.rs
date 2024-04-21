use super::{version::Version, Migration};

use crate::StorageConnection;

pub(crate) struct V1_07_01;

mod requisition_line_add_item_name;

impl Migration for V1_07_01 {
    fn version(&self) -> Version {
        Version::from_str("1.7.1")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        requisition_line_add_item_name::migrate(connection)?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_07_01() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_07_01.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
