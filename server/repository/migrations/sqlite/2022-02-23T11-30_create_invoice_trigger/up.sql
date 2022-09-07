CREATE TRIGGER invoice_insert_trigger
  AFTER INSERT ON invoice
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ("invoice", NEW.id, "UPSERT", NEW.name_id, NEW.store_id);
  END;

CREATE TRIGGER invoice_update_trigger
  AFTER UPDATE ON invoice
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ("invoice", NEW.id, "UPSERT", NEW.name_id, NEW.store_id);
  END;

CREATE TRIGGER invoice_delete_trigger
  AFTER DELETE ON invoice
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ("invoice", OLD.id, "DELETE", OLD.name_id, OLD.store_id);
  END;
