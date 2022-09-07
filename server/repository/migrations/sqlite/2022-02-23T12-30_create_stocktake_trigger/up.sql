CREATE TRIGGER stocktake_insert_trigger
  AFTER INSERT ON stocktake
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stocktake', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER stocktake_update_trigger
  AFTER UPDATE ON stocktake
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stocktake', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER stocktake_delete_trigger
  AFTER DELETE ON stocktake
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stocktake', OLD.id, 'DELETE');
  END;
