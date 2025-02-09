use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_name_next_of_kin_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // Not adding reference constraint as next of kin name might not be synced with patient
            r#"
                ALTER TABLE name ADD COLUMN next_of_kin_id TEXT;
            "#
        )?;

        // Reset translate all names on the next sync
        sql!(
            connection,
            r#"
            UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'name';
        "#,
        )?;

        Ok(())
    }
}
