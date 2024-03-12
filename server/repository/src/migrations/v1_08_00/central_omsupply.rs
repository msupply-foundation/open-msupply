use crate::{migrations::*, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
                ALTER TABLE sync_log ADD pull_v6_started_datetime TIMESTAMP;
                ALTER TABLE sync_log ADD pull_v6_finished_datetime TIMESTAMP;
                ALTER TABLE sync_log ADD pull_v6_progress_total INTEGER;
                ALTER TABLE sync_log ADD pull_v6_progress_done INTEGER; 
        "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SYNC_PULL_CURSOR_V6';
            "#
        )?;
    }

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
