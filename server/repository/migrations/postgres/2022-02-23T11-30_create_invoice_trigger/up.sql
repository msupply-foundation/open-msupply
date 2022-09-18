CREATE FUNCTION upsert_invoice_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
          VALUES ('invoice', NEW.id, 'UPSERT', NEW.name_id, NEW.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE FUNCTION delete_invoice_changelog()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
          VALUES ('invoice', OLD.id, 'DELETE', OLD.name_id, OLD.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER invoice_upsert_trigger
  AFTER INSERT OR UPDATE ON invoice
  FOR EACH ROW EXECUTE FUNCTION upsert_invoice_changelog();

CREATE TRIGGER invoice_delete_trigger
  AFTER DELETE ON invoice
  FOR EACH ROW EXECUTE FUNCTION delete_invoice_changelog();
