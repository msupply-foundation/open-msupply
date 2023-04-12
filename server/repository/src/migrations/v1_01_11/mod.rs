use crate::{migrations::*, StorageConnection};
pub(crate) struct V1_01_11;

impl Migration for V1_01_11 {
    fn version(&self) -> Version {
        Version::from_str("1.1.11")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE name_tag (
                id TEXT NOT NULL PRIMARY KEY,
                tag_name TEXT NOT NULL
            );
            "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE name_tag_join (
                id TEXT NOT NULL PRIMARY KEY,
                name_id TEXT NOT NULL REFERENCES name(id),
                name_tag_id TEXT NOT NULL REFERENCES name_tag(id)
            );
            "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE period_schedule (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL
            );
            "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE period (
                id TEXT NOT NULL PRIMARY KEY,
                period_schedule_id TEXT NOT NULL REFERENCES period_schedule(id),
                name TEXT NOT NULL,
                start_date {DATE} NOT NULL,
                end_date {DATE} NOT NULL
            );
            "#
        )?;

        // Commented for this PR as not used yet...
        // // Program
        // sql!(
        //     connection,
        //     r#"
        //     CREATE TABLE program (
        //         id TEXT NOT NULL PRIMARY KEY,
        //         name TEXT NOT NULL,
        //         master_list_id TEXT NOT NULL REFERENCES master_list(id)
        //     );
        //     "#
        // )?;

        // // Program Settings
        // sql!(
        //     connection,
        //     r#"
        //     CREATE TABLE program_settings (
        //         id TEXT NOT NULL PRIMARY KEY,
        //         tag_name TEXT NOT NULL,
        //         program_id TEXT NOT NULL REFERENCES program(id),
        //         period_schedule_id TEXT NOT NULL REFERENCES period_schedule(id)
        //     );
        //     "#
        // )?;

        // // Program Order Type
        // sql!(
        //     connection,
        //     r#"
        //     CREATE TABLE program_order_type (
        //         id TEXT NOT NULL PRIMARY KEY,
        //         program_settings_id TEXT NOT NULL REFERENCES program_settings(id),
        //         name TEXT NOT NULL,
        //         threshold_mos {DOUBLE} NOT NULL,
        //         max_mos {DOUBLE} NOT NULL,
        //         max_order_per_period {DOUBLE} NOT NULL
        //     );
        //     "#
        // )?;

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
