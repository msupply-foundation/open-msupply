use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "contact_trace"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE contact_trace (
                id TEXT NOT NULL PRIMARY KEY,
                program_id TEXT NOT NULL REFERENCES program(id),
                document_id TEXT NOT NULL REFERENCES document(id),
                datetime TIMESTAMP,
                contact_trace_id TEXT,
                patient_id TEXT NOT NULL REFERENCES name(id),
                contact_patient_id TEXT REFERENCES name(id),
                first_name TEXT,
                last_name TEXT,
                gender TEXT,
                date_of_birth TIMESTAMP,
                store_id TEXT REFERENCES store(id)
            );"#,
        )?;

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                ALTER TYPE document_registry_type RENAME TO document_registry_category;
                ALTER TYPE document_registry_category ADD VALUE IF NOT EXISTS 'CONTACT_TRACE';
            "#,
        )?;

        Ok(())
    }
}
