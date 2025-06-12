use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "extend_name_table_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE NAME ADD COLUMN hsh_code TEXT;
                ALTER TABLE NAME ADD COLUMN hsh_name TEXT;
                ALTER TABLE NAME ADD COLUMN margin {DOUBLE};
                ALTER TABLE NAME ADD COLUMN freight_factor {DOUBLE};
                ALTER TABLE NAME ADD COLUMN currency_id TEXT REFERENCES currency(id);
            "#
        )?;

        Ok(())
    }
}
