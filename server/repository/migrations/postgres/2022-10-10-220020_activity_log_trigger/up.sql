CREATE FUNCTION upsert_activity_log_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
          VALUES ('activity_log', NEW.id, 'UPSERT', NEW.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER activity_log_upsert_trigger
  AFTER INSERT OR UPDATE ON activity_log
  FOR EACH ROW EXECUTE FUNCTION upsert_activity_log_changelog();