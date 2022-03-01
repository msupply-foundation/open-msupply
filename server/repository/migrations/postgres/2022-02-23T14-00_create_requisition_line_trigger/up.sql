CREATE TRIGGER requisition_line_trigger
  AFTER INSERT OR UPDATE OR DELETE ON requisition_line
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();
