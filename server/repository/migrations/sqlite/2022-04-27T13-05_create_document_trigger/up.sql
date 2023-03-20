CREATE TRIGGER document_insert_trigger
  AFTER INSERT ON document
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
      VALUES ('document', NEW.id, 'UPSERT', NEW.is_sync_update);
  END;

CREATE TRIGGER document_update_trigger
  AFTER UPDATE ON document
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
      VALUES ('document', NEW.id, 'UPSERT', NEW.is_sync_update);
  END;

CREATE TRIGGER document_delete_trigger
  AFTER DELETE ON document
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('document', OLD.id, 'DELETE');
  END;
