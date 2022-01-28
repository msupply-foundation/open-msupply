CREATE TRIGGER stock_take_insert_trigger
  AFTER INSERT ON stock_take
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('stock_take', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER stock_take_update_trigger
  AFTER UPDATE ON stock_take
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('stock_take', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER stock_take_delete_trigger
  AFTER DELETE ON stock_take
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('stock_take', OLD.id, 'DELETE');
  END;
