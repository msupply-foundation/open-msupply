use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "diagnosis_add_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE invoice ADD COLUMN diagnosis_id TEXT REFERENCES diagnosis(id);
        "#
        )?;
// We don't re-translate existing invoices here, as they could have been changed since the sync buffer record and could be overwritten
        Ok(())
    }
}
