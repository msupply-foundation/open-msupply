use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Asset triggers
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset';

                CREATE TRIGGER asset_trigger
                AFTER INSERT OR UPDATE ON asset
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
    }

    Ok(())
}
