ALTER TYPE changelog_table_name ADD VALUE 'clinician' AFTER 'activity_log';

CREATE TRIGGER clinician_trigger
  AFTER INSERT OR UPDATE ON clinician
  FOR EACH ROW EXECUTE FUNCTION update_changelog_upsert_with_sync();