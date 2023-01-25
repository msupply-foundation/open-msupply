ALTER TYPE changelog_table_name ADD VALUE 'clinician' AFTER 'activity_log';

CREATE TRIGGER clinician_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clinician
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();