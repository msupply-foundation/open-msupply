use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_class';

                CREATE TRIGGER asset_class_trigger
                AFTER INSERT OR UPDATE ON asset_class
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_class_insert_trigger
                AFTER INSERT ON asset_class
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("asset_class", NEW.id, "UPSERT");
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_class_update_trigger
                AFTER UPDATE ON asset_class
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('asset_class', NEW.id, 'UPSERT');
                END;
            "#
        )?;
    }
    Ok(())
}
