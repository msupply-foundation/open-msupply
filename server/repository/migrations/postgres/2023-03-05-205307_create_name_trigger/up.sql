CREATE TRIGGER name_upsert_trigger
  AFTER INSERT OR UPDATE ON "name"
  FOR EACH ROW EXECUTE FUNCTION update_changelog_upsert_with_sync();