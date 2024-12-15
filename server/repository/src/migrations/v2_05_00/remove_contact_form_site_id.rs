use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_contact_form_site_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Dropped as not needed
        sql!(
            connection,
            r#"
                ALTER TABLE contact_form DROP COLUMN site_id;
            "#
        )?;

        Ok(())
    }
}
