use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        ALTER TABLE encounter
        ADD COLUMN patient_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
        UPDATE encounter
        SET patient_link_id = patient_id;
        
        ALTER TABLE encounter ADD CONSTRAINT encounter_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES name_link(id);
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        PRAGMA foreign_keys = OFF;
        ALTER TABLE encounter
        ADD COLUMN patient_link_id TEXT NOT NULL REFERENCES name_link(id) DEFAULT 'temp_for_migration';
        
        UPDATE encounter
        SET patient_link_id = patient_id;
        PRAGMA foreign_keys = ON;
     "#,
    )?;

    sql! {
        connection,
        r#"
        DROP INDEX index_encounter_patient_id;
        ALTER TABLE encounter DROP COLUMN patient_id;
        CREATE INDEX "index_encounter_patient_link_id_fkey" ON "encounter" ("patient_link_id");
        "#
    }?;

    Ok(())
}
