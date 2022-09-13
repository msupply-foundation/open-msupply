CREATE FUNCTION upsert_requisition_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('requisition', NEW.id, 'UPSERT', NEW.name_id, NEW.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE FUNCTION delete_requisition_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('requisition', OLD.id, 'DELETE', OLD.name_id, OLD.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER requisition_upsert_trigger
  AFTER INSERT OR UPDATE ON requisition
  FOR EACH ROW EXECUTE FUNCTION upsert_requisition_changelog();

CREATE TRIGGER requisition_delete_trigger
  AFTER DELETE ON requisition
  FOR EACH ROW EXECUTE FUNCTION delete_requisition_changelog();
