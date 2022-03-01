CREATE TRIGGER stock_line_trigger
  AFTER INSERT OR UPDATE OR DELETE ON stock_line
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();
  