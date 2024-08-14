use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_low_stock_and_requisition_line_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE TYPE rn_r_form_low_stock AS ENUM (
                    'OK',
                    'BELOW_HALF',
                    'BELOW_QUARTER'
                );
                "#
            )?;
        }

        const RNR_LOW_STOCK_ENUM_TYPE: &str = if cfg!(feature = "postgres") {
            "rn_r_form_low_stock"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                ALTER TABLE rnr_form_line ADD requisition_line_id TEXT REFERENCES requisition_line(id);
                ALTER TABLE rnr_form_line ADD low_stock {RNR_LOW_STOCK_ENUM_TYPE} NOT NULL DEFAULT 'OK';
            "#
        )?;

        Ok(())
    }
}
