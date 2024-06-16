use crate::{
    migrations::{sql, DATETIME},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // vaccine_course
    sql!(
        connection,
        r#"
        CREATE TABLE vaccine_course (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            program_id TEXT NOT NULL REFERENCES program(id),
            demographic_indicator_id TEXT REFERENCES demographic_indicator(id),
            coverage_rate FLOAT NOT NULL DEFAULT 100,
            is_active BOOL NOT NULL DEFAULT true,
            wastage_rate FLOAT NOT NULL DEFAULT 0,
            doses INT,
            deleted_datetime {DATETIME}
        );
        "#
    )?;

    // vaccine_course_item
    sql!(
        connection,
        r#"
        CREATE TABLE vaccine_course_item (
            id TEXT PRIMARY KEY NOT NULL,
            vaccine_course_id TEXT NOT NULL REFERENCES vaccine_course(id),
            item_link_id TEXT NOT NULL REFERENCES item_link(id)
        );
        "#
    )?;

    // vaccine_course_schedule
    sql!(
        connection,
        r#"
        CREATE TABLE vaccine_course_schedule (
            id TEXT PRIMARY KEY NOT NULL,
            vaccine_course_id TEXT NOT NULL REFERENCES vaccine_course(id),
            dose_number INT NOT NULL,
            label INT NOT NULL
        );
        "#
    )?;

    Ok(())
}
