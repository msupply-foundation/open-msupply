use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_rnr_form_line_entered_losses_default"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE rnr_form_line ALTER COLUMN entered_losses DROP DEFAULT;
                "#
            )?;
        } else {
            // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
            const RNR_LOW_STOCK_ENUM_TYPE: &str = "TEXT";

            sql!(
                connection,
                r#"
                    PRAGMA foreign_keys = OFF;

                    ALTER TABLE rnr_form_line RENAME TO rnr_form_line_old;
                    
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
                        confirmed BOOLEAN NOT NULL DEFAULT FALSE,
                        entered_losses {DOUBLE},
                        minimum_quantity {DOUBLE} NOT NULL DEFAULT 0.0
                    );

                    INSERT INTO rnr_form_line (
                        id,
                        rnr_form_id,
                        item_link_id,
                        requisition_line_id,
                        average_monthly_consumption,
                        previous_monthly_consumption_values,
                        initial_balance,
                        snapshot_quantity_received,
                        snapshot_quantity_consumed,
                        snapshot_adjustments,
                        entered_quantity_received,
                        entered_quantity_consumed,
                        entered_adjustments,
                        adjusted_quantity_consumed,
                        stock_out_duration,
                        final_balance,
                        maximum_quantity,
                        expiry_date,
                        calculated_requested_quantity,
                        low_stock,
                        entered_requested_quantity,
                        comment,
                        confirmed,
                        entered_losses,
                        minimum_quantity
                    )
                    SELECT
                        id,
                        rnr_form_id,
                        item_link_id,
                        requisition_line_id,
                        average_monthly_consumption,
                        previous_monthly_consumption_values,
                        initial_balance,
                        snapshot_quantity_received,
                        snapshot_quantity_consumed,
                        snapshot_adjustments,
                        entered_quantity_received,
                        entered_quantity_consumed,
                        entered_adjustments,
                        adjusted_quantity_consumed,
                        stock_out_duration,
                        final_balance,
                        maximum_quantity,
                        expiry_date,
                        calculated_requested_quantity,
                        low_stock,
                        entered_requested_quantity,
                        comment,
                        confirmed,
                        entered_losses,
                        minimum_quantity
                    FROM rnr_form_line_old;

                    DROP TABLE rnr_form_line_old;

                    PRAGMA foreign_keys = ON;
                "#
            )?;
        }

        Ok(())
    }
}
