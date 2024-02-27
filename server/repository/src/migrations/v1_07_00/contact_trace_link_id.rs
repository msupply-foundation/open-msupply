use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
          -- Adding contact_trace.patient_link_id and contact_trace.contact_patient_link_id
          ALTER TABLE contact_trace
          ADD COLUMN patient_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
          ALTER TABLE contact_trace
          ADD COLUMN contact_patient_link_id TEXT;

          UPDATE contact_trace SET patient_link_id = patient_id;
          UPDATE contact_trace SET contact_patient_link_id = contact_patient_id;

          ALTER TABLE contact_trace ADD CONSTRAINT contact_trace_patient_link_id
            FOREIGN KEY (patient_link_id)
            REFERENCES name_link(id);
          ALTER TABLE contact_trace ADD CONSTRAINT contact_trace_contact_patient_link_id
            FOREIGN KEY (contact_patient_link_id)
            REFERENCES name_link(id);
     "#,
    )?;
    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Adding contact_trace.patient_link_id and contact_trace.contact_patient_link_id
          PRAGMA foreign_keys = OFF;

          ALTER TABLE contact_trace
          ADD COLUMN patient_link_id TEXT NOT NULL REFERENCES name_link (id) DEFAULT 'temp_for_migration'; 
          ALTER TABLE contact_trace
          ADD COLUMN contact_patient_link_id TEXT REFERENCES name_link (id); 

          UPDATE contact_trace SET patient_link_id = patient_id;
          UPDATE contact_trace SET contact_patient_link_id = contact_patient_id;

          PRAGMA foreign_keys = ON;
          "#,
    )?;

    sql!(
        connection,
        r#"
        DROP INDEX index_contact_trace_patient_id;
        DROP INDEX index_contact_trace_contact_patient_id;
        ALTER TABLE contact_trace DROP COLUMN patient_id;
        ALTER TABLE contact_trace DROP COLUMN contact_patient_id;
        CREATE INDEX "index_contact_trace_patient_link_id" ON "contact_trace" ("patient_link_id");
        CREATE INDEX "index_contact_trace_contact_patient_link_id" ON "contact_trace" ("contact_patient_link_id");
    "#
    )?;

    #[cfg(feature = "postgres")]
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
            ON ct.contact_patient_link_id = contact_patient_name_link.id
        ;
        "#
    )?;

    #[cfg(not(feature = "postgres"))]
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
            ON ct.contact_patient_link_id = contact_patient_name_link.id
        ;
        "#
    )?;
    Ok(())
}
