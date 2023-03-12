CREATE FUNCTION upsert_name_store_join_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
          VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id);
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER name_store_join_upsert_trigger
  AFTER INSERT OR UPDATE ON name_store_join
  FOR EACH ROW EXECUTE FUNCTION upsert_name_store_join_changelog();
