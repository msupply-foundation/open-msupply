use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS contact_trace_name_link_view;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(not(feature = "postgres")) {
            sql!(
                connection,
                r#"
                    CREATE VIEW contact_trace_name_link_view AS
                    SELECT
                        ct.id AS id,
                        ct.program_id AS program_id,
                        ct.document_id AS document_id,
                        ct.datetime AS datetime,
                        ct.contact_trace_id AS contact_trace_id,
                        patient_name_link.name_id AS patient_id,
                        contact_patient_name_link.name_id AS contact_patient_id,
                        ct.first_name AS first_name,
                        ct.last_name AS last_name,
                        ct.gender AS gender,
                        ct.date_of_birth AS date_of_birth,
                        ct.store_id AS store_id,
                        ct.relationship AS relationship
                    FROM contact_trace ct
                    INNER JOIN name_link as patient_name_link
                        ON ct.patient_link_id = patient_name_link.id
                    LEFT JOIN name_link as contact_patient_name_link
                        ON ct.contact_patient_link_id = contact_patient_name_link.id;
                "#
            )?;
        }

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    CREATE VIEW contact_trace_name_link_view AS
                    SELECT
                        ct.id AS id,
                        ct.program_id AS program_id,
                        ct.document_id AS document_id,
                        ct.datetime AS datetime,
                        ct.contact_trace_id AS contact_trace_id,
                        patient_name_link.name_id AS patient_id,
                        contact_patient_name_link.name_id AS contact_patient_id,
                        ct.first_name AS first_name,
                        ct.last_name AS last_name,
                        ct.gender AS gender,
                        CAST(ct.date_of_birth AS DATE) AS date_of_birth,
                        ct.store_id AS store_id,
                        ct.relationship AS relationship
                    FROM contact_trace ct
                    INNER JOIN name_link as patient_name_link
                        ON ct.patient_link_id = patient_name_link.id
                    LEFT JOIN name_link as contact_patient_name_link
                        ON ct.contact_patient_link_id = contact_patient_name_link.id;
                "#
            )?;
        }

        Ok(())
    }
}
