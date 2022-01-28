CREATE TRIGGER stock_take_insert_trigger
  AFTER INSERT OR UPDATE OR DELETE ON stock_take
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();
