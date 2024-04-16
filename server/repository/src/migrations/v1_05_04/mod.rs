use super::{sql, version::Version, Migration};

use crate::StorageConnection;

pub(crate) struct V1_05_04;

impl Migration for V1_05_04 {
    fn version(&self) -> Version {
        Version::from_str("1.5.04")
    }

    fn migrate(&self, connection: &mut StorageConnection) -> anyhow::Result<()> {
        // Update integration_datetime on facility/store type name records in sync_buffer
        // when server start, or on next sync these will be re-integrated
        sql!(
            connection,
            r#"
                ALTER TABLE name ADD COLUMN custom_data TEXT DEFAULT NULL;
                UPDATE sync_buffer SET integration_datetime = NULL 
                    WHERE record_id IN (SELECT id FROM name where name."type" IN ('FACILITY', 'STORE'));
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_05_04() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_05_04.version();

    // This test allows checking sql syntax
    let SetupResult { mut connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&mut connection), version);
}
