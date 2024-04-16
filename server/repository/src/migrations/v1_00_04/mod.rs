use crate::StorageConnection;

use super::{version::Version, Migration};

pub(crate) struct V1_00_04;

impl Migration for V1_00_04 {
    fn version(&self) -> Version {
        Version::from_str("1.0.4")
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(
            connection,
            r#"ALTER TYPE key_type ADD VALUE 'DATABASE_VERSION';"#
        )?;

        Ok(())
    }
    #[cfg(not(feature = "postgres"))]
    fn migrate(&self, _: &mut StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_00_04() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_00_04.version();

    let SetupResult { mut connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&mut connection), version);
}
