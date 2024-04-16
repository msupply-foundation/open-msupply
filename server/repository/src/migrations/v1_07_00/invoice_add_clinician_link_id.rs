use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            ALTER TABLE invoice
            ADD COLUMN clinician_link_id TEXT;

            UPDATE invoice SET clinician_link_id = clinician_id;

            ALTER TABLE invoice ADD CONSTRAINT invoice_clinician_link_id_fkey FOREIGN KEY (clinician_link_id) REFERENCES clinician_link(id);
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            PRAGMA foreign_keys = OFF;
            ALTER TABLE invoice
            ADD COLUMN clinician_link_id TEXT REFERENCES clinician_link (id); 
            UPDATE invoice SET clinician_link_id = clinician_id;
            PRAGMA foreign_keys = ON;
            "#,
    )?;

    sql! {
        connection,
        r#"
        DROP INDEX IF EXISTS index_invoice_clinician_id;
        ALTER TABLE invoice DROP COLUMN clinician_id;
        CREATE INDEX "index_invoice_clinician_link_id_fkey" ON "invoice" ("clinician_link_id");
        "#
    }?;

    Ok(())
}
