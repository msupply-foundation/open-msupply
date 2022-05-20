CREATE TRIGGER stocktake_line_trigger
  AFTER INSERT OR UPDATE OR DELETE ON stocktake_line
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();
