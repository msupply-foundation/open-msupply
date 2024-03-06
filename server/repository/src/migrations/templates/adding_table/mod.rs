use crate::migrations::*;
pub(crate) struct V1_00_05;

impl Migration for V1_00_05 {
    fn version(&self) -> Version {
        Version::from_str("1.0.5")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // DATE, DATETIME, etc.. comes from src/migrations/types.rs, which is re-exported in src/migrations/mod.rs
        sql!(
            connection,
            r#"
        CREATE TABLE test_table (
            id TEXT NOT NULL PRIMARY KEY,
            -- Common types for postgres and sqlite
            string_field TEXT,
            not_null_string_field TEXT NOT NULL,
            integer_field INTEGER,
            big_integer_field BIGINT,
            boolean_field BOOLEAN,
            -- Types that differ between postgres and sqlite
            date_field {DATE},
            datetime_field {DATETIME},
            decimal_field {DOUBLE}
        );
        "#
        )?;

        // Shows that syntax is the same for references in postgres and sqlite
        sql!(
            connection,
            r#"
        CREATE TABLE test_table_with_reference (
            id TEXT NOT NULL PRIMARY KEY,
            test_table_id TEXT NOT NULL REFERENCES test_table(id)
        );
        "#
        )?;

        // Showing enum type in postgres and TEXT in sqlite
        #[cfg(not(feature = "postgres"))]
        const TEST_ENUM_TYPE: &'static str = "TEXT";
        #[cfg(feature = "postgres")]
        const TEST_ENUM_TYPE: &'static str = "test_enum_type";
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                CREATE TYPE {TEST_ENUM_TYPE} AS ENUM (
                    'one',
                    'two',
                    'three'
                );
                "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TABLE test_table_with_enum (
                    id TEXT NOT NULL PRIMARY KEY,
                    type {TEST_ENUM_TYPE}
                );
                "#
        )?;

        // At the time of writing, serial was not added to common types since it was rarely used
        // example shows addition of conditional type, inline
        sql!(
            connection,
            r#"
                CREATE TABLE test_serial_table (
                    id {serial}
                );
                "#,
            serial = if cfg!(feature = "postgres") {
                "BIGSERIAL NOT NULL PRIMARY KEY"
            } else {
                "INTEGER PRIMARY KEY"
            }
        )?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_00_05() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_00_05.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);

    // Repository tests should check that rows can be inserted and queried
    // Also repository test can check for enum mapping, see sync_log_row.rs, use of EnumIter

    // Data test should only be done in migrations when data is migrated
}
