-- V7 indexes with all nullable fields as partial indexes
CREATE INDEX index_changelog_source_site_id ON changelog (source_site_id) WHERE source_site_id IS NOT NULL;
CREATE INDEX index_changelog_store_id ON changelog (store_id) WHERE store_id IS NOT NULL;
CREATE INDEX index_changelog_transfer_store_id ON changelog (transfer_store_id) WHERE transfer_store_id IS NOT NULL;
CREATE INDEX index_changelog_patient_id ON changelog (patient_id) WHERE patient_id IS NOT NULL;
