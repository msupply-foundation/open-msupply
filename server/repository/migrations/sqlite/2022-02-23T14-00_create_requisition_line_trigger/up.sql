CREATE TRIGGER requisition_line_insert_trigger
  AFTER INSERT ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('requisition_line', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER requisition_line_update_trigger
  AFTER UPDATE ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('requisition_line', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER requisition_line_delete_trigger
  AFTER DELETE ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('requisition_line', OLD.id, 'DELETE');
  END;
