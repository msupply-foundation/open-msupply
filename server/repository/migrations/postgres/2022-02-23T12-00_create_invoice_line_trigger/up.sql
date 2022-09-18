CREATE FUNCTION upsert_invoice_line_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'invoice_line', NEW.id, 'UPSERT', name_id, store_id FROM invoice WHERE id = NEW.invoice_id;
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE FUNCTION delete_invoice_line_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'invoice_line', OLD.id, 'DELETE', name_id, store_id FROM invoice WHERE id = OLD.invoice_id;
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER invoice_line_upsert_trigger
  AFTER INSERT OR UPDATE ON invoice_line
  FOR EACH ROW EXECUTE FUNCTION upsert_invoice_line_changelog();

CREATE TRIGGER invoice_line_delete_trigger
  AFTER DELETE ON invoice_line
  FOR EACH ROW EXECUTE FUNCTION delete_invoice_line_changelog();
