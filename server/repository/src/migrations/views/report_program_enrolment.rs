use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS report_program_enrolment;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW report_program_enrolment AS
    SELECT
        program_enrolment.id,
        program_enrolment.document_type,
        program_enrolment.enrolment_datetime,
        program_enrolment.program_enrolment_id,
        program_enrolment.status,
        nl.name_id as patient_id,
        doc.data as document_data
    FROM program_enrolment
    LEFT JOIN name_link nl ON nl.id = program_enrolment.patient_link_id
    LEFT JOIN report_document doc ON doc.name = program_enrolment.document_name;

            "#
        )?;

        Ok(())
    }
}
