CREATE TRIGGER stocktake_line_insert_trigger
  AFTER INSERT ON stocktake_line
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('stocktake_line', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER stocktake_line_update_trigger
  AFTER UPDATE ON stocktake_line
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('stocktake_line', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER stocktake_line_delete_trigger
  AFTER DELETE ON stocktake_line
  BEGIN
    INSERT INTO changelog (table_name, row_id, row_action)
      VALUES ('stocktake_line', OLD.id, 'DELETE');
  END;
