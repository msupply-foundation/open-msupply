use super::{version::Version, Migration};
use crate::StorageConnection;

pub(crate) struct V1_01_02;

impl Migration for V1_01_02 {
    fn version(&self) -> Version {
        Version::from_str("1.1.2")
    }

    fn migrate(&self, connection: &mut StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(
            connection,
            r#"ALTER TABLE stock_line
                ADD supplier_id TEXT REFERENCES name(id);"#
        )?;

        #[cfg(not(feature = "postgres"))]
        const INVENTORY_ADJUSTMENT_REASON_TYPE: &str = "TEXT";
        #[cfg(feature = "postgres")]
        const INVENTORY_ADJUSTMENT_REASON_TYPE: &str = "inventory_adjustment_type";
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                CREATE TYPE {INVENTORY_ADJUSTMENT_REASON_TYPE} AS ENUM (
                    'POSITIVE',
                    'NEGATIVE'
                );
                "#
        )?;

        sql!(
            connection,
            r#"CREATE TABLE inventory_adjustment_reason (
                id TEXT NOT NULL PRIMARY KEY,
                type {INVENTORY_ADJUSTMENT_REASON_TYPE},
                is_active BOOLEAN,
                reason TEXT NOT NULL
            );"#
        )?;

        sql!(
            connection,
            r#"ALTER TABLE invoice_line 
                ADD inventory_adjustment_reason_id TEXT REFERENCES inventory_adjustment_reason(id);"#
        )?;

        sql!(
            connection,
            r#"ALTER TABLE stocktake_line 
                ADD inventory_adjustment_reason_id TEXT REFERENCES inventory_adjustment_reason(id);"#
        )?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_02() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_02.version();

    let SetupResult { mut connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&mut connection), version);
}
