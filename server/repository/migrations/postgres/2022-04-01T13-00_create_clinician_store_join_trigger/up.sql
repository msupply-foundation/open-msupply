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
