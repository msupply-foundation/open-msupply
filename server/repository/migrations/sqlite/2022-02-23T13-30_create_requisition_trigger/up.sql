CREATE TRIGGER requisition_insert_trigger
  AFTER INSERT ON requisition
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('requisition', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER requisition_update_trigger
  AFTER UPDATE ON requisition
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('requisition', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER requisition_delete_trigger
  AFTER DELETE ON requisition
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('requisition', OLD.id, 'DELETE');
  END;
