use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "indicator_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE INDEX program_indicator_program_id ON program_indicator(program_id);
            CREATE INDEX indicator_column_program_indicator_id ON indicator_column(program_indicator_id);
            CREATE INDEX indicator_line_program_indicator_id ON indicator_line(program_indicator_id);
            CREATE INDEX indicator_value_customer_name_link_id ON indicator_value(customer_name_link_id);
            CREATE INDEX indicator_value_store_id ON indicator_value(store_id);
            CREATE INDEX indicator_value_period_id ON indicator_value(period_id);
            CREATE INDEX indicator_value_indicator_line_id ON indicator_value(indicator_line_id);
            CREATE INDEX indicator_value_indicator_column_id ON indicator_value(indicator_column_id);
            "#
        )?;
        Ok(())
    }
}
