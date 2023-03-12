ALTER TYPE changelog_table_name ADD VALUE 'document' AFTER 'clinician_store_join';

CREATE TRIGGER document_trigger
  AFTER INSERT OR UPDATE OR DELETE ON document
  FOR EACH ROW EXECUTE PROCEDURE update_changelog();