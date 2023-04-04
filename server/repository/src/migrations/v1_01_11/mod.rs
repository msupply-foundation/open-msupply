use crate::{migrations::*, StorageConnection};
pub(crate) struct V1_01_11;

impl Migration for V1_01_11 {
    fn version(&self) -> Version {
        Version::from_str("1.1.11")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Store Tag
        sql!(
            connection,
            r#"
            CREATE TABLE store_tag (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL
            );
            "#
        )?;

        // Store Tag Join
        sql!(
            connection,
            r#"
            CREATE TABLE store_tag_join (
                id TEXT NOT NULL PRIMARY KEY,
                store_id TEXT NOT NULL REFERENCES store(id),
                store_tag_id TEXT NOT NULL REFERENCES store_tag(id)
            );
            "#
        )?;

        // Period Schedule
        sql!(
            connection,
            r#"
            CREATE TABLE period_schedule (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL
            );
            "#
        )?;

        // Period
        sql!(
            connection,
            r#"
            CREATE TABLE period (
                id TEXT NOT NULL PRIMARY KEY,
                period_schedule_id TEXT NOT NULL REFERENCES period_schedule(id),
                name TEXT NOT NULL,
                start_date {DATE} NOT NULL, -- `to` is a reserved word in postgres and sqlite
                end_date {DATE} NOT NULL -- `from` is a reserved word in postgres and sqlite
            );
            "#
        )?;

        // Program
        sql!(
            connection,
            r#"
            CREATE TABLE program (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                master_list_id TEXT NOT NULL REFERENCES master_list(id)
            );
            "#
        )?;

        // Program Settings
        sql!(
            connection,
            r#"
            CREATE TABLE program_settings (
                id TEXT NOT NULL PRIMARY KEY,
                store_tag_id TEXT NOT NULL REFERENCES store_tag(id),
                program_id TEXT NOT NULL REFERENCES program(id),
                period_schedule_id TEXT NOT NULL REFERENCES period_schedule(id)
            );
            "#
        )?;

        // Program Order Type
        sql!(
            connection,
            r#"
            CREATE TABLE program_order_type (
                id TEXT NOT NULL PRIMARY KEY,
                program_settings_id TEXT NOT NULL REFERENCES program_settings(id),
                name TEXT NOT NULL,
                threshold_mos {DOUBLE} NOT NULL,
                max_mos {DOUBLE} NOT NULL,
                max_order_per_period {DOUBLE} NOT NULL
            );
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_10_11() {
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

    // Repository tests should check that rows can be inserted and queried
    // Also repository test can check for enum mapping, see sync_log_row.rs, use of EnumIter

    // Data test should only be done in migrations when data is migrated
}
