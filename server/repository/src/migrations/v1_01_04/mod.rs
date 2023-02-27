use crate::StorageConnection;

use super::{version::Version, Migration};

pub(crate) struct V1_01_04;

impl Migration for V1_01_04 {
    fn version(&self) -> Version {
        Version::from_str("1.1.4")
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(
            connection,
            r#"ALTER TYPE context_type ADD VALUE IF NOT EXISTS 'DISPENSARY';"#
        )?;

        Ok(())
    }
    #[cfg(not(feature = "postgres"))]
    fn migrate(&self, _: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_04() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_04.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
