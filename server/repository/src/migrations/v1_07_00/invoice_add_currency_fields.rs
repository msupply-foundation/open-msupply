use crate::{
    migrations::{sql, DOUBLE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE invoice ADD COLUMN currency_id TEXT REFERENCES currency(id);
        ALTER TABLE invoice ADD COLUMN currency_rate {DOUBLE};
        ALTER TABLE invoice ADD COLUMN foreign_currency_total {DOUBLE};

        "#,
    )?;

    Ok(())
}
