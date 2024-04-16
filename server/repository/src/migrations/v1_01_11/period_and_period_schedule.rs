use crate::{
    migrations::{sql, DATE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
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

    Ok(())
}
