CREATE TRIGGER requisition_line_insert_trigger
  AFTER INSERT ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "requisition_line", NEW.id, "UPSERT", name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
  END;

CREATE TRIGGER requisition_line_update_trigger
  AFTER UPDATE ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "requisition_line", NEW.id, "UPSERT", name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
  END;

CREATE TRIGGER requisition_line_delete_trigger
  AFTER DELETE ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "requisition_line", OLD.id, "DELETE", name_id, store_id FROM requisition WHERE id = OLD.requisition_id;
  END;
