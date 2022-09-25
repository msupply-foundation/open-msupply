CREATE TRIGGER invoice_line_insert_trigger
  AFTER INSERT ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "invoice_line", NEW.id, "UPSERT", name_id, store_id FROM invoice WHERE id = NEW.invoice_id;
  END;

CREATE TRIGGER invoice_line_update_trigger
  AFTER UPDATE ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "invoice_line", NEW.id, "UPSERT", name_id, store_id FROM invoice WHERE id = NEW.invoice_id;
  END;

CREATE TRIGGER invoice_line_delete_trigger
  AFTER DELETE ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "invoice_line", OLD.id, "DELETE", name_id, store_id FROM invoice WHERE id = OLD.invoice_id;
  END;
