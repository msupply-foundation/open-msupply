use super::{version::Version, Migration};

pub(crate) struct V1_01_07;

impl Migration for V1_01_07 {
    fn version(&self) -> Version {
        Version::from_str("1.1.7")
    }
    fn migrate(&self, connection: &crate::StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;
        sql!(
            connection,
            r#"
            ALTER TABLE store_preference ADD COLUMN use_authorisation_for_customer_requisitions bool NOT NULL DEFAULT false;
            ALTER TABLE store_preference ADD COLUMN requisitions_require_supplier_authorisation bool NOT NULL DEFAULT false;
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_07() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_07.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
