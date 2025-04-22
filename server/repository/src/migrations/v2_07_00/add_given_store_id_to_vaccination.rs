use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_given_store_id_to_vaccination"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Also adds item_link_id column - vaccinations can be given at different stores.
        // Before now, only way to determine the vaccine item given was via the invoice/stock line.
        // This information is only available at the "giving" store, but other stores may
        // need to know which item was given.
        sql!(
            connection,
            r#"
                ALTER TABLE vaccination ADD COLUMN given_store_id TEXT;
                ALTER TABLE vaccination ADD COLUMN item_link_id TEXT;

                UPDATE vaccination SET given_store_id = store_id WHERE given = TRUE;

                UPDATE vaccination
                SET item_link_id = (
                    SELECT sl.item_link_id
                    FROM stock_line sl
                    WHERE sl.id = vaccination.stock_line_id
                )
                WHERE given = TRUE
                AND stock_line_id IS NOT NULL;
            "#
        )?;

        Ok(())
    }
}
