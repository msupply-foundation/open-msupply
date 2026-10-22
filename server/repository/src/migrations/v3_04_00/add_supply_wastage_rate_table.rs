use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_supply_wastage_rate_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- A supply's own wastage rate (%), applied on top of what it is ordered
                -- against through its ancillary links (e.g. AD syringes broken or
                -- dropped). One per item, set on central; 0 means none.
                CREATE TABLE supply_wastage_rate (
                    id TEXT NOT NULL PRIMARY KEY,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    wastage_rate {DOUBLE} NOT NULL
                );
                CREATE INDEX index_supply_wastage_rate_item_link_id
                    ON supply_wastage_rate (item_link_id);
            "#
        )?;

        Ok(())
    }
}
