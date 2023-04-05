use crate::StorageConnection;

use super::{version::Version, Migration};

pub(crate) struct V1_01_11;

impl Migration for V1_01_11 {
    fn version(&self) -> Version {
        Version::from_str("1.1.11")
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(
            connection,
            r#"ALTER TYPE activity_log_type ADD VALUE 'INVOICE_NUMBER_ALLOCATED';"#
        )?;
        sql!(
            connection,
            r#"ALTER TYPE activity_log_type ADD VALUE 'REQUISITION_NUMBER_ALLOCATED';"#
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
async fn migration_1_01_11() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_11.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
