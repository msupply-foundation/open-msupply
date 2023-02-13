use super::{version::Version, Migration};
use crate::StorageConnection;

pub(crate) struct V1_01_03;

impl Migration for V1_01_03 {
    fn version(&self) -> Version {
        Version::from_str("1.1.3")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(connection, r#"DROP VIEW IF EXISTS item_is_visible;"#)?;

        #[cfg(not(feature = "postgres"))]
        const STORE_PREFERENCE_TYPE: &'static str = "TEXT";
        #[cfg(feature = "postgres")]
        const STORE_PREFERENCE_TYPE: &'static str = "store_preference_type";
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                CREATE TYPE {STORE_PREFERENCE_TYPE} AS ENUM (
                    'STORE_PREFERENCES'
                );
                "#
        )?;

        sql!(
            connection,
            r#"CREATE TABLE store_preference (
                id TEXT NOT NULL PRIMARY KEY,
                type {STORE_PREFERENCE_TYPE} DEFAULT 'STORE_PREFERENCES',
                pack_to_one BOOLEAN NOT NULL DEFAULT false
        );"#
        )?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_03() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_03.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
