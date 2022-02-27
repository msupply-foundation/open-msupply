CREATE TRIGGER requisition_trigger
  AFTER INSERT OR UPDATE OR DELETE ON requisition
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();
