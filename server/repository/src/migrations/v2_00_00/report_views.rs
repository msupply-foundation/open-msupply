use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE VIEW report_store AS
        SELECT
            store.id,
            store.code,
            store.store_mode,
            store.logo,
            name.name
        FROM store
        JOIN name ON store.name_id = name.id
        ;
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE VIEW report_patient AS
        SELECT
            id,
            code,
            national_health_number AS code_2,
            first_name,
            last_name,
            gender,
            date_of_birth,
            address1,
            phone,
            date_of_death,
            is_deceased
        FROM name
        ;
        "#
    )?;

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
        WHERE d.status != 'DELETED'
        "#
    )?;

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
        LEFT JOIN name_link nl ON nl.id = e.patient_link_id
        "#
    )?;

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
        LEFT JOIN report_document doc ON doc.name = program_enrolment.document_name
        ;
        "#
    )?;

    sql!(
        connection,
        r#"
        CREATE VIEW report_encounter AS
        SELECT
            encounter.id,
            encounter.created_datetime,
            encounter.start_datetime,
            encounter.end_datetime,
            encounter.status,
            encounter.store_id,
            nl.name_id as patient_id,
            encounter.document_type,
            doc.data as document_data
        FROM encounter
        LEFT JOIN name_link nl ON nl.id = encounter.patient_link_id
        LEFT JOIN report_document doc ON doc.name = encounter.document_name
        ;
        "#
    )?;

    Ok(())
}
