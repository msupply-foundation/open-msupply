use crate::{migrations::*, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE asset (
                id TEXT NOT NULL PRIMARY KEY,
                store_id TEXT NOT NULL REFERENCES store(id),
                property TEXT,
                is_sync_update BOOLEAN NOT NULL DEFAULT FALSE
            );
        "#,
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset';

                CREATE TRIGGER asset_trigger
                AFTER INSERT OR UPDATE OR DELETE ON asset
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_insert_trigger
                AFTER INSERT ON asset
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("asset", NEW.id, "UPSERT");
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_update_trigger
                AFTER UPDATE ON asset
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('asset', NEW.id, 'UPSERT');
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_delete_trigger
                AFTER DELETE ON asset
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('asset', OLD.id, 'DELETE');
                END;
            "#
        )?;
    }

    Ok(())
}
