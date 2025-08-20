use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS report_document;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let absolute = if cfg!(feature = "postgres") {
            "@"
        } else {
            "abs"
        };

        sql!(
            connection,
            r#"
                -- This view contains the latest document versions
                CREATE VIEW report_document AS
    SELECT
        d.name,
        d.datetime,
        d.type,
        d.data,
        nl.name_id as owner_name_id
    FROM (
        SELECT name as doc_name, MAX(datetime) AS doc_time
        FROM document
        GROUP BY name
    ) grouped
    INNER JOIN document d ON d.name = grouped.doc_name AND d.datetime = grouped.doc_time
    LEFT JOIN name_link nl ON nl.id = d.owner_name_link_id
    WHERE d.status != 'DELETED';   
            "#
        )?;

        Ok(())
    }
}
