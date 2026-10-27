use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_wastage_rate_to_ancillary_item"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- The ancillary's own wastage rate (%) as a supply, added on top of the
                -- ratio (e.g. AD syringes broken or dropped). Set per ancillary item and
                -- kept the same on every link to it; 0 means none.
                ALTER TABLE ancillary_item
                ADD COLUMN wastage_rate {DOUBLE} NOT NULL DEFAULT 0;
            "#
        )?;

        Ok(())
    }
}
