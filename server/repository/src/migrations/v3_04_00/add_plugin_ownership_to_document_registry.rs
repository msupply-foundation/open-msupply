use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_plugin_ownership_to_document_registry"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Both NULL for an entry no plugin installed (pulled from legacy central,
        // or written by `insertDocumentRegistry`). See `DocumentRegistryRow`.
        sql!(
            connection,
            r#"
                ALTER TABLE document_registry ADD COLUMN plugin_code TEXT;
                ALTER TABLE document_registry ADD COLUMN program_key TEXT;
            "#
        )?;

        Ok(())
    }
}
