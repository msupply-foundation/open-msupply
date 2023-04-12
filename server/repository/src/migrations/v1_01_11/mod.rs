mod is_sync_updated_for_requisition;
mod remote_authorisation;

use crate::{migrations::*, StorageConnection};
pub(crate) struct V1_01_11;

impl Migration for V1_01_11 {
    fn version(&self) -> Version {
        Version::from_str("1.1.11")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Remote authorisation
        remote_authorisation::migrate(connection)?;
        is_sync_updated_for_requisition::migrate(connection)?;

        sql!(
            connection,
            r#"
            ALTER TABLE store_preference ADD COLUMN response_requisition_requires_authorisation bool NOT NULL DEFAULT false;
        "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_11() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_11.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
