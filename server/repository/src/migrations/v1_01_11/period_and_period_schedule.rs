use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "period_and_period_schedule"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
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
}
