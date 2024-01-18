use repository::{ClinicianLinkRow, ClinicianLinkRowRepository, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use crate::sync::translations::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

#[derive(Deserialize)]
pub struct ClinicianMergeMessage {
    #[serde(rename = "mergeIdToKeep")]
    pub merge_id_to_keep: String,
    #[serde(rename = "mergeIdToDelete")]
    pub merge_id_to_delete: String,
}

pub(crate) struct ClinicianMergeTranslation {}
impl SyncTranslation for ClinicianMergeTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::CLINICIAN,
            dependencies: vec![],
        }
    }

    fn try_translate_pull_merge(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if sync_record.table_name != LegacyTableName::CLINICIAN {
            return Ok(None);
        }

        let data = serde_json::from_str::<ClinicianMergeMessage>(&sync_record.data)?;

        let clinician_link_repo = ClinicianLinkRowRepository::new(connection);
        let clinician_links =
            clinician_link_repo.find_many_by_clinician_id(&data.merge_id_to_delete)?;
        if clinician_links.len() == 0 {
            return Ok(None);
        }
        let indirect_link = clinician_link_repo
            .find_one_by_id(&data.merge_id_to_keep)?
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "Could not find clinician link with id {}",
                    data.merge_id_to_keep
                )
            })?;

        let upsert_records: Vec<PullUpsertRecord> = clinician_links
            .into_iter()
            .map(|ClinicianLinkRow { id, .. }| {
                PullUpsertRecord::ClinicianLink(ClinicianLinkRow {
                    id,
                    clinician_id: indirect_link.clinician_id.clone(),
                })
            })
            .collect();

        Ok(Some(IntegrationRecords::from_upserts(upsert_records)))
    }
}
