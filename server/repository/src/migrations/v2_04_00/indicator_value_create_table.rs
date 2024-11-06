use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "indicator_value_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(feature = "postgres")]
        {
            sql!(
                connection,
                r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'indicator_value';
            "#
            )?;
        }

        sql!(
            connection,
            r#"
            CREATE TABLE indicator_value (
                id TEXT PRIMARY KEY NOT NULL,
                customer_name_link_id TEXT NOT NULL REFERENCES name_link(id),
                supplier_store_id TEXT NOT NULL REFERENCES store(id),
                period_id TEXT NOT NULL REFERENCES period(id),
                indicator_line_id TEXT NOT NULL REFERENCES indicator_line(id),
                indicator_column_id TEXT NOT NULL REFERENCES indicator_column(id),
                value TEXT NOT NULL
            );
            "#
        )?;
        Ok(())
    }
}
