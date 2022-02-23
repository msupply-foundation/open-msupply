CREATE TRIGGER invoice_line_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();
