use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "strip_sync_message_type_quotes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Pre-v7 the column was written via `serde_json::to_string`, which
        // wraps the variant name in literal double-quotes (e.g. the column
        // contained `"RequestFieldChange"` — 21 chars including quotes).
        // The new strum-based encoding stores the bare name. Strip the
        // surrounding quotes from any pre-existing rows so they decode
        // correctly under the new format.
        sql!(
            connection,
            r#"
                UPDATE sync_message
                SET type = SUBSTR(type, 2, LENGTH(type) - 2)
                WHERE LENGTH(type) >= 2
                  AND SUBSTR(type, 1, 1) = '"'
                  AND SUBSTR(type, LENGTH(type), 1) = '"';
            "#
        )?;

        Ok(())
    }
}
