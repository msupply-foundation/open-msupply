CREATE FUNCTION upsert_requisition_line_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'requisition_line', NEW.id, 'UPSERT', name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
    -- Ignored for AFTER trigger
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE FUNCTION delete_requisition_line_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'requisition_line', OLD.id, 'DELETE', name_id, store_id FROM requisition WHERE id = OLD.requisition_id;
    -- Ignored for AFTER trigger
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER requisition_line_upsert_trigger
  AFTER INSERT OR UPDATE ON requisition_line
  FOR EACH ROW EXECUTE FUNCTION upsert_requisition_line_changelog();

CREATE TRIGGER requisition_line_delete_trigger
  AFTER DELETE ON requisition_line
  FOR EACH ROW EXECUTE FUNCTION delete_requisition_line_changelog();
