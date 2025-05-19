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
                ALTER TABLE invoice RENAME COLUMN default_donor_id TO default_donor_link_id;
                ALTER TABLE invoice_line RENAME COLUMN donor_id TO donor_link_id;
                ALTER TABLE stock_line RENAME COLUMN donor_id TO donor_link_id;
            "#
        )?;

        Ok(())
    }
}
