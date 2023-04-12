CREATE TRIGGER requisition_insert_trigger
  AFTER INSERT ON requisition
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ("requisition", NEW.id, "UPSERT", NEW.name_id, NEW.store_id);
  END;

CREATE TRIGGER requisition_update_trigger
  AFTER UPDATE ON requisition
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ("requisition", NEW.id, "UPSERT", NEW.name_id, NEW.store_id);
  END;

CREATE TRIGGER requisition_delete_trigger
  AFTER DELETE ON requisition
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ("requisition", OLD.id, "DELETE", OLD.name_id, OLD.store_id);
  END;
