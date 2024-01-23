use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding program_event.patient_link_id
        ALTER TABLE program_event
        ADD COLUMN patient_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';

        UPDATE program_event
        SET patient_link_id = patient_id;

        ALTER TABLE program_event ADD CONSTRAINT program_event_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES name_link(id);

        DROP INDEX index_program_event_patient_id;
        ALTER TABLE program_event DROP COLUMN patient_id;
       "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        PRAGMA foreign_keys = OFF;

        DROP INDEX index_program_event_patient_id;

        -- program_events uses a FOREIGN KEY(patient_id) REFERENCES name(id) expression which can't be dropped in sqlite!
        -- Thus recreate the table:
        ALTER TABLE program_event RENAME TO program_event_old;
        CREATE TABLE program_event (
            id TEXT NOT NULL PRIMARY KEY,
            patient_link_id TEXT REFERENCES name(id),
            datetime TIMESTAMP NOT NULL,
            active_start_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_start_datetime),
            active_end_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_end_datetime),
            document_type TEXT NOT NULL,
            document_name TEXT,
            type TEXT NOT NULL,
            data TEXT,
            context_id TEXT REFERENCES context(id)
        );
        INSERT INTO program_event SELECT
            id,
            patient_id as patient_link_id,
            datetime,
            active_start_datetime,
            active_end_datetime,
            document_type,
            document_name,
            type,
            data,
            context_id
        FROM program_event_old;
        DROP TABLE program_event_old;

        PRAGMA foreign_keys = ON;
     "#,
    )?;

    sql!(
        connection,
        r#"
            CREATE INDEX "index_program_event_patient_link_id" ON "program_event" ("patient_link_id");
        "#
    )?;
    Ok(())
}
