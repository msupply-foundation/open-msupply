CREATE TRIGGER invoice_insert_trigger
  AFTER INSERT ON invoice
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('invoice', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER invoice_update_trigger
  AFTER UPDATE ON invoice
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('invoice', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER invoice_delete_trigger
  AFTER DELETE ON invoice
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('invoice', OLD.id, 'DELETE');
  END;
