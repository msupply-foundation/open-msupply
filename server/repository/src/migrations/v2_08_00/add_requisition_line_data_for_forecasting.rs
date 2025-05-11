use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_requisition_line_data_for_forecasting"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition_line ADD COLUMN forecast_num_people INTEGER;
                ALTER TABLE requisition_line ADD COLUMN forecast_num_doses INTEGER;
                ALTER TABLE requisition_line ADD COLUMN forecast_coverage_rate {DOUBLE};
                ALTER TABLE requisition_line ADD COLUMN forecast_loss_factor {DOUBLE};
            "#
        )?;

        Ok(())
    }
}
