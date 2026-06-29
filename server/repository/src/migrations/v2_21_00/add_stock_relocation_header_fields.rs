use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_stock_relocation_header_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stock_relocation ADD COLUMN reference_number TEXT NOT NULL DEFAULT '';
                ALTER TABLE stock_relocation ADD COLUMN comment TEXT;
                ALTER TABLE stock_relocation RENAME COLUMN user_id TO created_by;
                ALTER TABLE stock_relocation DROP COLUMN from_stock_line_id;
                ALTER TABLE stock_relocation DROP COLUMN from_location_id;
                ALTER TABLE stock_relocation DROP COLUMN from_number_of_packs;
                ALTER TABLE stock_relocation DROP COLUMN to_stock_line_id;
                ALTER TABLE stock_relocation DROP COLUMN to_location_id;
                ALTER TABLE stock_relocation DROP COLUMN to_pack_size;
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE stock_relocation_status ADD VALUE IF NOT EXISTS 'CONFIRMED' BEFORE 'FINALISED';
                "#
            )?;
        }

        Ok(())
    }
}
