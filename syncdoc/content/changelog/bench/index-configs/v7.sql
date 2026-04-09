-- V7 indexes: full btree on source_site_id and store_id, partial on transfer_store_id and patient_id
CREATE INDEX index_changelog_source_site_id ON changelog USING btree (source_site_id);
CREATE INDEX index_changelog_store_id ON changelog USING btree (store_id);
CREATE INDEX index_changelog_transfer_store_id ON changelog (transfer_store_id) WHERE transfer_store_id IS NOT NULL;
CREATE INDEX index_changelog_patient_id ON changelog (patient_id) WHERE patient_id IS NOT NULL;
