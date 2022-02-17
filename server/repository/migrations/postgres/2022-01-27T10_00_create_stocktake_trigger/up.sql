CREATE TRIGGER stocktake_insert_trigger
  AFTER INSERT OR UPDATE OR DELETE ON stocktake
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();
