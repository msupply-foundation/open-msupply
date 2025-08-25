use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS latest_document;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW latest_document
    AS
        SELECT d.*
        FROM (
        SELECT name, MAX(datetime) AS datetime
            FROM document
            GROUP BY name
    ) grouped
    INNER JOIN document d
    ON d.name = grouped.name AND d.datetime = grouped.datetime;
            "#
        )?;

        Ok(())
    }
}
