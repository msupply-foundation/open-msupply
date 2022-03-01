CREATE TRIGGER invoice_line_insert_trigger
  AFTER INSERT ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('invoice_line', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER invoice_line_update_trigger
  AFTER UPDATE ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('invoice_line', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER invoice_line_delete_trigger
  AFTER DELETE ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('invoice_line', OLD.id, 'DELETE');
  END;
