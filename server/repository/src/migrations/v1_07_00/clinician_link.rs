use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "clinician_link"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE clinician_link (
                    id TEXT NOT NULL PRIMARY KEY,
                    clinician_id TEXT NOT NULL REFERENCES clinician(id)
                );
                CREATE INDEX "index_clinician_link_clinician_id_fkey" ON "clinician_link" ("clinician_id");
                INSERT INTO clinician_link SELECT id, id FROM clinician;
            "#,
        )?;

        Ok(())
    }
}
