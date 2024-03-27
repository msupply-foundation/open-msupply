use crate::StorageConnection;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                UPDATE invoice SET currency_id = (SELECT id FROM currency WHERE is_home_currency = true) WHERE currency_id is NULL;
                ALTER TABLE invoice ALTER COLUMN currency_id SET NOT NULL;
            "#
        )?;
    }
    else{
        sql!(
        connection,
        r#"
            -- Set foreign key constraints off
            PRAGMA foreign_keys=off;
            ALTER TABLE invoice RENAME COLUMN currency_id TO old_currency_id;
            ALTER TABLE invoice ADD COLUMN currency_id TEXT REFERENCES currency(id) NOT NULL DEFAULT '';
            UPDATE invoice SET currency_id = old_currency_id;
            UPDATE invoice SET currency_id = (SELECT id FROM currency WHERE is_home_currency = true) WHERE currency_id = '';
            ALTER TABLE invoice DROP COLUMN old_currency_id;
            PRAGMA foreign_keys=on;
        "#
    )?;
    }

    Ok(())
}
