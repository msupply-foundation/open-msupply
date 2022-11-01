CREATE TRIGGER activity_log_insert_trigger
  AFTER INSERT ON activity_log
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ("activity_log", NEW.id, "UPSERT", NEW.store_id);
  END;
