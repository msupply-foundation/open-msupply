use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            ALTER TABLE encounter
            ADD COLUMN clinician_link_id TEXT;

            UPDATE encounter SET clinician_link_id = clinician_id;

            ALTER TABLE encounter ADD CONSTRAINT encounter_clinician_link_id_fkey FOREIGN KEY (clinician_link_id) REFERENCES clinician_link(id);
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            PRAGMA foreign_keys = OFF;
            ALTER TABLE encounter
            ADD COLUMN clinician_link_id TEXT REFERENCES clinician_link (id); 
            UPDATE encounter SET clinician_link_id = clinician_id;
            PRAGMA foreign_keys = ON;
        "#,
    )?;

    sql!(
        connection,
        r#"
            DROP INDEX index_encounter_clinician_id;
            ALTER TABLE encounter DROP COLUMN clinician_id;
            CREATE INDEX "index_encounter_clinician_link_id_fkey" ON "encounter" ("clinician_link_id");
        "#
    )?;

    Ok(())
}
