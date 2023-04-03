CREATE FUNCTION update_changelog_upsert_with_sync()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
          VALUES (TG_TABLE_NAME::changelog_table_name, NEW.id, 'UPSERT', NEW.is_sync_update);
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';
