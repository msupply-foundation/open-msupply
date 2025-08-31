use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS report_program_event;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW report_program_event AS
    SELECT
        e.id,
        nl.name_id as patient_id,
        e.datetime,
        e.active_start_datetime,
        e.active_end_datetime,
        e.document_type,
        e.document_name,
        e.type,
        e.data
    FROM program_event e
    LEFT JOIN name_link nl ON nl.id = e.patient_link_id;
            "#
        )?;

        Ok(())
    }
}
