use crate::StorageConnection;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(
        connection,
        r#"
            ALTER TABLE invoice RENAME COLUMN currency_id TO old_currency_id;
            ALTER TABLE invoice ADD COLUMN currency_id TEXT REFERENCES currency(id) NOT NULL;
            UPDATE invoice SET currency_id = old_currency_id;
            UPDATE invoice SET currency_id = (SELECT id FROM currency WHERE is_home_currency = true) AND currency_id = '';
            ALTER TABLE invoice DROP COLUMN old_currency_id;
        "#
    )?;

    Ok(())
}
