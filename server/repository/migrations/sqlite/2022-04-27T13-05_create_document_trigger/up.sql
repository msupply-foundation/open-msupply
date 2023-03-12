CREATE TRIGGER document_insert_trigger
  AFTER INSERT ON document
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('document', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER document_update_trigger
  AFTER UPDATE ON document
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('document', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER document_delete_trigger
  AFTER DELETE ON document
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('document', OLD.id, 'DELETE');
  END;
