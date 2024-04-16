use super::{version::Version, Migration};
use crate::StorageConnection;

pub(crate) struct V1_01_03;

impl Migration for V1_01_03 {
    fn version(&self) -> Version {
        Version::from_str("1.1.3")
    }

    fn migrate(&self, connection: &mut StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(connection, r#"DROP VIEW IF EXISTS item_is_visible;"#)?;
        sql!(
            connection,
            r#"ALTER TABLE store 
                ADD logo TEXT;"#
        )?;

        #[cfg(not(feature = "postgres"))]
        const STORE_PREFERENCE_TYPE: &str = "TEXT";
        #[cfg(feature = "postgres")]
        const STORE_PREFERENCE_TYPE: &str = "store_preference_type";
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

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"ALTER TYPE language_type ADD VALUE IF NOT EXISTS 'TETUM';"#
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

    let SetupResult { mut connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&mut connection), version);
}
