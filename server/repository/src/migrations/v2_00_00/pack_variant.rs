use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE pack_variant (
                id TEXT NOT NULL PRIMARY KEY,
                item_id TEXT NOT NULL REFERENCES item(id),
                short_name TEXT NOT NULL,
                long_name TEXT NOT NULL,
                pack_size INTEGER NOT NULL,
                is_active BOOL NOT NULL DEFAULT TRUE
            );
        "#,
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'pack_variant';
                CREATE TRIGGER pack_variant_trigger
                AFTER INSERT OR UPDATE ON pack_variant
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
                CREATE TRIGGER pack_variant_insert_trigger
                AFTER INSERT ON pack_variant
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("pack_variant", NEW.id, "UPSERT");
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER pack_variant_update_trigger
                AFTER UPDATE ON pack_variant
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('pack_variant', NEW.id, 'UPSERT');
                END;
            "#
        )?;
    }

    Ok(())
}
