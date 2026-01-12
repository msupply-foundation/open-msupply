use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "location_movement_triggers"
    }

    #[cfg(not(feature = "postgres"))]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
        CREATE TRIGGER location_movement_insert_trigger
          AFTER INSERT ON location_movement
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id)
              VALUES ("location_movement", NEW.id, "UPSERT", NEW.store_id);
          END;

        CREATE TRIGGER location_movement_update_trigger
          AFTER UPDATE ON location_movement
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id)
              VALUES ("location_movement", NEW.id, "UPSERT", NEW.store_id);
          END;

        CREATE TRIGGER location_movement_delete_trigger
          AFTER DELETE ON location_movement
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id)
              VALUES ("location_movement", OLD.id, "DELETE", OLD.store_id);
          END;
        "#
        )?;

        Ok(())
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
        ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'location_movement';
        "#
        )?;

        sql!(
            connection,
            r#"
        CREATE TRIGGER location_movement_trigger
        AFTER INSERT OR UPDATE OR DELETE ON location_movement
        FOR EACH ROW EXECUTE PROCEDURE update_changelog();
        "#
        )?;

        Ok(())
    }
}
