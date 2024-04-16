use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        ALTER TABLE program_enrolment
        ADD COLUMN patient_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
        UPDATE program_enrolment
        SET patient_link_id = patient_id;
        
        ALTER TABLE program_enrolment ADD CONSTRAINT program_enrolment_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES name_link(id);
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        PRAGMA foreign_keys = OFF;
        ALTER TABLE program_enrolment
        ADD COLUMN patient_link_id TEXT REFERENCES name_link(id) NOT NULL DEFAULT 'temp_for_migration';
        
        UPDATE program_enrolment
        SET patient_link_id = patient_id;
        PRAGMA foreign_keys = ON;
     "#,
    )?;

    sql! {
        connection,
        r#"
        DROP INDEX index_program_enrolment_patient_id;
        ALTER TABLE program_enrolment DROP COLUMN patient_id;
        CREATE INDEX "index_program_enrolment_patient_link_id_fkey" ON "program_enrolment" ("patient_link_id");
        "#
    }?;

    Ok(())
}
