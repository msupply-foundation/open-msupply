ALTER TYPE changelog_table_name ADD VALUE 'clinician' AFTER 'activity_log';

CREATE FUNCTION upsert_clinician_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
          VALUES ('clinician', NEW.id, 'UPSERT', NEW.is_sync_update);
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER clinician_trigger
  AFTER INSERT OR UPDATE ON clinician
  FOR EACH ROW EXECUTE FUNCTION upsert_clinician_changelog();