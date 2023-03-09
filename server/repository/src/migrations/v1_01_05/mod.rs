use super::{version::Version, Migration};
use crate::StorageConnection;

pub(crate) struct V1_01_05;

impl Migration for V1_01_05 {
    fn version(&self) -> Version {
        Version::from_str("1.1.5")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(
            connection,
            r#"ALTER TABLE name_store_join
                ADD is_active BOOLEAN;"#
        )?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_05() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_05.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
