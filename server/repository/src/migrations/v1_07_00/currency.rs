use crate::{
    migrations::{sql, DATE, DOUBLE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE currency (
            id TEXT NOT NULL PRIMARY KEY,
            rate {DOUBLE} NOT NULL,
            code TEXT NOT NULL,
            is_home_currency BOOLEAN NOT NULL DEFAULT FALSE,
            date_updated {DATE}
        );

        "#,
    )?;

    #[cfg(feature = "postgres")]
    {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'currency';

                CREATE TRIGGER currency_trigger
                AFTER INSERT OR UPDATE OR DELETE ON currency
                FOR EACH ROW EXECUTE PROCEDURE update_changelog(); 
            "#
        )?;
    }

    #[cfg(not(feature = "postgres"))]
    {
        sql!(
            connection,
            r#"
                CREATE TRIGGER currency_insert_trigger
                AFTER INSERT ON currency
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("currency", NEW.id, "UPSERT");
                END;

                CREATE TRIGGER currency_update_trigger
                AFTER UPDATE ON currency
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("currency", NEW.id, "UPSERT");
                END;

                CREATE TRIGGER currency_delete_trigger
                AFTER DELETE ON currency
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("currency", OLD.id, "DELETE");
                END;
            "#
        )?;
    }

    Ok(())
}
