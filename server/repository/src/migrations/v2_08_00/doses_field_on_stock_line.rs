use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "doses_field_on_stock_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stock_line ADD COLUMN vaccine_doses INTEGER;

                UPDATE stock_line
                SET vaccine_doses = (
                    SELECT 
                        CASE 
                            WHEN item.vaccine_doses = 0 THEN NULL 
                            ELSE item.vaccine_doses 
                        END
                    FROM item
                    INNER JOIN item_link ON item_link.id = stock_line.item_link_id
                    WHERE item.id = item_link.item_id
                );
            "#
        )?;

        Ok(())
    }
}
