use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "donor_id_to_donor_link_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- Add the new columns, with reference to the name_link table
                ALTER TABLE invoice ADD COLUMN default_donor_link_id TEXT REFERENCES name_link(id);
                ALTER TABLE invoice_line ADD COLUMN donor_link_id TEXT REFERENCES name_link(id);
                ALTER TABLE stock_line ADD COLUMN donor_link_id TEXT REFERENCES name_link(id);

                -- Assign existing values to the new columns
                UPDATE invoice SET default_donor_link_id = default_donor_id;
                UPDATE invoice_line SET donor_link_id = donor_id;
                UPDATE stock_line SET donor_link_id = donor_id;

                -- Remove the old columns
                ALTER TABLE invoice DROP COLUMN default_donor_id;
                ALTER TABLE invoice_line DROP COLUMN donor_id;
                ALTER TABLE stock_line DROP COLUMN donor_id;
            "#
        )?;

        Ok(())
    }
}
