use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        CREATE TABLE contact_trace (
          id TEXT NOT NULL PRIMARY KEY,
          program_id Text,
          datetime TIMESTAMP,
          contact_trace_id TEXT,
          status TEXT NOT NULL,
          patient_id TEXT REFERENCES name(id),
          first_name TEXT,
          last_name TEXT
        );"#,
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        CREATE TYPE contact_trace_status AS ENUM (
          'PENDING',
          'DONE'
        );
        
        CREATE TABLE contact_trace (
          id TEXT NOT NULL PRIMARY KEY,
          program_id Text,
          datetime TIMESTAMP,
          contact_trace_id TEXT,
          status contact_trace_status NOT NULL,
          patient_id TEXT REFERENCES name(id),
          first_name TEXT,
          last_name TEXT
        );"#,
    )?;

    Ok(())
}
