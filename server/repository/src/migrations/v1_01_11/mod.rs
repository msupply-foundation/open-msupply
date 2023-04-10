use super::{version::Version, Migration};

pub(crate) struct V1_01_11;

impl Migration for V1_01_11 {
    fn version(&self) -> Version {
        Version::from_str("1.1.11")
    }
    fn migrate(&self, connection: &crate::StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;
        sql!(
            connection,
            r#"
            ALTER TABLE store_preference ADD COLUMN requisitions_require_supplier_authorisation bool NOT NULL DEFAULT false;
        "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE authoriser (
                id TEXT NOT NULL PRIMARY KEY,
                is_active bool NOT NULL,
                master_list_id text NOT NULL,
                user_id text NOT NULL,
                FOREIGN KEY(master_list_id) REFERENCES master_list(id)
            );            
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

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
