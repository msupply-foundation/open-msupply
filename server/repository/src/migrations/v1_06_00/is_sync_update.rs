use crate::{migrations::sql, StorageConnection};

#[cfg(not(feature = "postgres"))]
fn migrate_triggers(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TRIGGER clinician_insert_trigger
          AFTER INSERT ON clinician
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('clinician', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;

        CREATE TRIGGER clinician_update_trigger
          AFTER UPDATE ON clinician
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('clinician', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;

        CREATE TRIGGER clinician_delete_trigger
          AFTER DELETE ON clinician
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('clinician', OLD.id, 'DELETE', OLD.is_sync_update);
          END;
        "#
    )?;
    sql!(
        connection,
        r#"
        CREATE TRIGGER clinician_store_join_insert_trigger
          AFTER INSERT ON clinician_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('clinician_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
          END;
        
        CREATE TRIGGER clinician_store_join_update_trigger
          AFTER UPDATE ON clinician_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('clinician_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
          END;
        
        CREATE TRIGGER clinician_store_join_delete_trigger
          AFTER DELETE ON clinician_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('clinician_store_join', OLD.id, 'DELETE', OLD.store_id, OLD.is_sync_update);
          END;
        "#
    )?;
    sql!(
        connection,
        r#"
        CREATE TRIGGER name_insert_trigger
          AFTER INSERT ON name
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('name', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;

        CREATE TRIGGER name_update_trigger
          AFTER UPDATE ON name
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('name', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;
        "#
    )?;
    sql!(
        connection,
        r#"
        CREATE TRIGGER document_insert_trigger
          AFTER INSERT ON document
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('document', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;
        
        CREATE TRIGGER document_update_trigger
          AFTER UPDATE ON document
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('document', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;
        "#
    )?;
    sql!(
        connection,
        r#"
        CREATE TRIGGER name_store_join_insert_trigger
          AFTER INSERT ON name_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
          END;

        CREATE TRIGGER name_store_join_update_trigger
          AFTER UPDATE ON name_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
          END;
        "#
    )?;
    Ok(())
}

#[cfg(feature = "postgres")]
fn migrate_triggers(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE FUNCTION update_changelog_upsert_with_sync()
        RETURNS trigger AS
        $$
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
                  VALUES (TG_TABLE_NAME::changelog_table_name, NEW.id, 'UPSERT', NEW.is_sync_update);
            RETURN NULL;
          END;
        $$ LANGUAGE 'plpgsql';
        "#
    )?;
    sql!(
        connection,
        r#"
        ALTER TYPE changelog_table_name ADD VALUE 'clinician' AFTER 'activity_log';

        CREATE TRIGGER clinician_trigger
          AFTER INSERT OR UPDATE ON clinician
          FOR EACH ROW EXECUTE FUNCTION update_changelog_upsert_with_sync();
        "#
    )?;
    sql!(
        connection,
        r#"
        ALTER TYPE changelog_table_name ADD VALUE 'clinician_store_join' AFTER 'clinician';

        CREATE FUNCTION upsert_clinician_store_join_changelog()
        RETURNS trigger AS
        $$
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
                  VALUES ('clinician_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
            RETURN NULL;
          END;
        $$ LANGUAGE 'plpgsql';

        CREATE TRIGGER clinician_store_join_trigger
          AFTER INSERT OR UPDATE ON clinician_store_join
          FOR EACH ROW EXECUTE FUNCTION upsert_clinician_store_join_changelog();
        "#
    )?;
    sql!(
        connection,
        r#"
        CREATE FUNCTION upsert_name_store_join_changelog()
        RETURNS trigger AS
        $$
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, name_id, is_sync_update)
                  VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.name_id, NEW.is_sync_update);
            RETURN NULL;
          END;
        $$ LANGUAGE 'plpgsql';

        CREATE TRIGGER name_store_join_upsert_trigger
          AFTER INSERT OR UPDATE ON name_store_join
          FOR EACH ROW EXECUTE FUNCTION upsert_name_store_join_changelog();
        "#
    )?;
    sql!(
        connection,
        r#"
        ALTER TYPE changelog_table_name ADD VALUE 'document' AFTER 'clinician_store_join';

        CREATE TRIGGER document_trigger
          AFTER INSERT OR UPDATE OR DELETE ON document
          FOR EACH ROW EXECUTE PROCEDURE update_changelog_upsert_with_sync();
        "#
    )?;
    sql!(
        connection,
        r#"
        CREATE TRIGGER name_upsert_trigger
        AFTER INSERT OR UPDATE ON "name"
        FOR EACH ROW EXECUTE FUNCTION update_changelog_upsert_with_sync();
        "#
    )?;
    Ok(())
}

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    // this migration may have been run, however if the upgrade is from < 1.2.00 then it
    // will have failed, as the clinician table was only added in 1.2, while the migration
    // was added in 1.1.14. Unable to use IF EXISTS in sqlite, so we are catching errors

    if sql!(
        connection,
        r#"
        ALTER TABLE name ADD is_sync_update BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE name_store_join ADD is_sync_update BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE clinician ADD is_sync_update BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE clinician_store_join ADD is_sync_update BOOLEAN NOT NULL DEFAULT FALSE;
      "#
    )
    .is_err()
    {
        println!("Database migration warning: Failed to add is_sync_update column to name, name_store_join, clinician and clinician_store_join as current version is < 1.2.00");
    }

    // these statements would have had the same problem
    if migrate_triggers(connection).is_err() {
        println!("Database migration warning: Failed to add triggers for is_sync_update as version is < 1.2.00");
    }

    Ok(())
}
