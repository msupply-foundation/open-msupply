use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_message_linked_record_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The counterpart record on the recipient's side of a transfer, so each
        // store can open its OWN record from a by-record message (spec messaging
        // › related records). Portable ADD COLUMN — same on sqlite and postgres.
        sql!(
            connection,
            r#"ALTER TABLE message ADD COLUMN linked_record_id TEXT;"#
        )?;

        Ok(())
    }
}
