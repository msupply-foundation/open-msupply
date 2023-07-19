use crate::migrations::sql;
use crate::{StorageConnection, PATIENT_CONTEXT_ID};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE context (
          id TEXT NOT NULL PRIMARY KEY,
          name TEXT NOT NULL
        );
        "#
    )?;

    sql!(
        connection,
        r#"
        ALTER TABLE program ADD COLUMN context_id TEXT REFERENCES context(id);
        "#
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            ALTER TABLE document ADD COLUMN context_id TEXT REFERENCES context(id);
            ALTER TABLE document DROP COLUMN context;

            ALTER TABLE program_event ADD COLUMN context_id TEXT REFERENCES context(id);
            ALTER TABLE program_event DROP COLUMN context;

            ALTER TABLE document_registry ADD COLUMN context_id TEXT REFERENCES context(id);
            ALTER TABLE document_registry DROP COLUMN document_context;

            ALTER TABLE user_permission ADD COLUMN context_id TEXT REFERENCES context(id);
            ALTER TABLE user_permission DROP COLUMN context;
            "#
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        ALTER TABLE document RENAME COLUMN context TO context_id;
        ALTER TABLE document ADD CONSTRAINT document_context_id_fkey FOREIGN KEY (context_id) REFERENCES context(id);

        ALTER TABLE program_event RENAME COLUMN context TO context_id;
        ALTER TABLE program_event ADD CONSTRAINT program_event_context_id_fkey FOREIGN KEY (context_id) REFERENCES context(id);

        -- Seems like that in postgres you need to recreate the view to make the new column visible...
        DROP VIEW latest_document;
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

        ALTER TABLE document_registry RENAME COLUMN document_context TO context_id;
        ALTER TABLE document_registry ADD CONSTRAINT document_registry_context_id_fkey FOREIGN KEY (context_id) REFERENCES context(id);

        ALTER TABLE user_permission RENAME COLUMN context TO context_id;
        ALTER TABLE user_permission ADD CONSTRAINT user_permission_context_id_fkey FOREIGN KEY (context_id) REFERENCES context(id);
        "#
    )?;

    sql!(
        connection,
        "INSERT INTO context (id, name) VALUES('{}', 'Patient context');",
        PATIENT_CONTEXT_ID
    )?;

    Ok(())
}
