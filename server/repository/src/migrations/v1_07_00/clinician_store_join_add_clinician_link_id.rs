use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            ALTER TABLE clinician_store_join
            ADD COLUMN clinician_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';

            UPDATE clinician_store_join SET clinician_link_id = clinician_id;

            ALTER TABLE clinician_store_join ADD CONSTRAINT clinician_store_join_clinician_link_id_fkey FOREIGN KEY (clinician_link_id) REFERENCES clinician_link(id);
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            PRAGMA foreign_keys = OFF;
            ALTER TABLE clinician_store_join
            ADD COLUMN clinician_link_id TEXT NOT NULL REFERENCES clinician_link (id) DEFAULT 'temp_for_migration'; 
            UPDATE clinician_store_join SET clinician_link_id = clinician_id;
            PRAGMA foreign_keys = ON;
        "#,
    )?;

    sql!(
        connection,
        r#"
        DROP INDEX index_clinician_store_join_clinician_id;
        ALTER TABLE clinician_store_join DROP COLUMN clinician_id;
        CREATE INDEX "index_clinician_store_join_clinician_link_id_fkey" ON "clinician_store_join" ("clinician_link_id");
        "#
    )?;

    Ok(())
}
