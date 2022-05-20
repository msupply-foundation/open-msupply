CREATE TRIGGER name_store_join_trigger
  AFTER INSERT OR UPDATE OR DELETE ON name_store_join
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();
