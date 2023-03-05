ALTER TYPE changelog_table_name ADD VALUE 'name' AFTER 'clinician_store_join';

CREATE FUNCTION upsert_name_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
          VALUES ('name', NEW.id, 'UPSERT');
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE FUNCTION delete_name_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
          VALUES ('name', OLD.id, 'DELETE');
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER name_upsert_trigger
  AFTER INSERT OR UPDATE ON name
  FOR EACH ROW EXECUTE FUNCTION upsert_name_changelog();

CREATE TRIGGER name_delete_trigger
  AFTER DELETE ON name
  FOR EACH ROW EXECUTE FUNCTION delete_name_changelog();
