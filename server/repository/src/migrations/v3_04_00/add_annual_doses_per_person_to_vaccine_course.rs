use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_annual_doses_per_person_to_vaccine_course"
    }

    // The average number of doses a person reached gets in a year, for population
    // forecasting. Null (every existing course) keeps forecasting as it did: every dose in
    // the course, every year.
    //
    // A site that pulled a course from a 3.04 central before upgrading dropped the value
    // as an unknown field, and central data only re-flows on initialisation or change. So
    // the `vaccine_course` buffer rows go back to pending (`is_integrated = false`, as the
    // sync-v7 buffer partitions on it), and the next sync re-integrates them with their
    // value. A row from an older central has none, and integrates as null.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course ADD COLUMN annual_doses_per_person {DOUBLE};

                UPDATE sync_buffer
                    SET is_integrated = FALSE,
                        integration_datetime = NULL,
                        integration_error = NULL
                    WHERE table_name = 'vaccine_course';
            "#
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::{
        prelude::*,
        sql_query,
        sql_types::{Bool, Nullable, Text, Timestamp},
    };

    fn insert_sync_buffer_row(connection: &StorageConnection, record_id: &str, table_name: &str) {
        sql_query(
            "INSERT INTO sync_buffer (record_id, received_datetime, integration_datetime, \
             table_name, action, data, source_site_id, is_integrated) \
             VALUES ($1, '2026-01-01 00:00:00', '2026-01-01 00:00:00', $2, 'UPSERT', '{}', 1, TRUE)",
        )
        .bind::<Text, _>(record_id)
        .bind::<Text, _>(table_name)
        .execute(connection.lock().connection())
        .unwrap();
    }

    #[derive(QueryableByName, Debug, PartialEq)]
    struct BufferState {
        #[diesel(sql_type = Text)]
        record_id: String,
        #[diesel(sql_type = Bool)]
        is_integrated: bool,
        #[diesel(sql_type = Nullable<Timestamp>)]
        integration_datetime: Option<chrono::NaiveDateTime>,
    }

    /// Already-integrated vaccine courses go back to pending, so the next sync picks up
    /// a value the site dropped before it knew the field; other tables are left alone.
    #[actix_rt::test]
    async fn migration_3_04_00_annual_doses_per_person_reintegrates_vaccine_courses() {
        let previous_version = v3_02_00::V3_02_00.version();
        let version = v3_04_00::V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_annual_doses_per_person"),
            version: Some(previous_version),
            ..Default::default()
        })
        .await;

        insert_sync_buffer_row(&connection, "course", "vaccine_course");
        insert_sync_buffer_row(&connection, "item", "item");

        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(get_database_version(&connection), version);

        let rows: Vec<BufferState> = sql_query(
            "SELECT record_id, is_integrated, integration_datetime FROM sync_buffer \
             ORDER BY record_id",
        )
        .load(connection.lock().connection())
        .unwrap();
        assert_eq!(
            rows,
            vec![
                BufferState {
                    record_id: "course".to_string(),
                    is_integrated: false,
                    integration_datetime: None,
                },
                BufferState {
                    record_id: "item".to_string(),
                    is_integrated: true,
                    integration_datetime: chrono::NaiveDate::from_ymd_opt(2026, 1, 1)
                        .and_then(|date| date.and_hms_opt(0, 0, 0)),
                },
            ]
        );
    }
}
