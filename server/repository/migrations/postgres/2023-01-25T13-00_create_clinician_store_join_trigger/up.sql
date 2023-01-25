ALTER TYPE changelog_table_name ADD VALUE 'clinician_store_join' AFTER 'clinician';

CREATE TRIGGER clinician_store_join_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clinician_store_join
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();