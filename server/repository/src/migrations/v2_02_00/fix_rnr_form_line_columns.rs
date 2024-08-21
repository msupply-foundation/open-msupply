use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "fix_rnr_form_line_columns"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        const RNR_LOW_STOCK_ENUM_TYPE: &str = if cfg!(feature = "postgres") {
            "rn_r_form_low_stock"
        } else {
            "TEXT"
        };

        // Need to remove reference constraint on requisition_line (as not synced to central)
        // and update item_id to item_link_id
        sql!(
            connection,
            r#"
               DROP TABLE rnr_form_line;

               CREATE TABLE rnr_form_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    rnr_form_id TEXT NOT NULL REFERENCES rnr_form(id),
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    requisition_line_id TEXT,

                    average_monthly_consumption {DOUBLE} NOT NULL,
                    previous_monthly_consumption_values TEXT NOT NULL,
                    initial_balance {DOUBLE} NOT NULL,
                    snapshot_quantity_received {DOUBLE} NOT NULL,
                    snapshot_quantity_consumed {DOUBLE} NOT NULL,
                    snapshot_adjustments {DOUBLE} NOT NULL,
                    entered_quantity_received {DOUBLE},
                    entered_quantity_consumed {DOUBLE},
                    entered_adjustments {DOUBLE},
                    adjusted_quantity_consumed {DOUBLE} NOT NULL,
                    stock_out_duration INTEGER NOT NULL,
                    final_balance {DOUBLE} NOT NULL,
                    maximum_quantity {DOUBLE} NOT NULL,
                    expiry_date {DATE},
                    calculated_requested_quantity {DOUBLE} NOT NULL,
                    low_stock {RNR_LOW_STOCK_ENUM_TYPE} NOT NULL DEFAULT 'OK',
                    entered_requested_quantity {DOUBLE},
                    comment TEXT,
                    confirmed BOOLEAN NOT NULL DEFAULT FALSE
                );
    
            "#
        )?;

        Ok(())
    }
}
