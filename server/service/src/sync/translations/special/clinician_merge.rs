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
        if clinician_links.is_empty() {
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

#[cfg(test)]
mod tests {
    use crate::sync::{
        sync_status::logger::SyncLogger, synchroniser::integrate_and_translate_sync_buffer,
    };

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ClinicianLinkRowRepository, SyncBufferAction,
        SyncBufferRow, SyncBufferRowRepository,
    };

    #[actix_rt::test]
    async fn test_clinician_merge() {
        let mut sync_records = vec![
            SyncBufferRow {
                record_id: "clinician_b_merge".to_string(),
                table_name: LegacyTableName::CLINICIAN.to_string(),
                action: SyncBufferAction::Merge,
                data: r#"{
                        "mergeIdToKeep": "clinician_b",
                        "mergeIdToDelete": "clinician_a"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
            SyncBufferRow {
                record_id: "clinician_c_merge".to_string(),
                table_name: LegacyTableName::CLINICIAN.to_string(),
                action: SyncBufferAction::Merge,
                data: r#"{
                      "mergeIdToKeep": "clinician_c",
                      "mergeIdToDelete": "clinician_b"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
        ];

        let expected_clinician_links = vec![
            ClinicianLinkRow {
                id: "clinician_a".to_string(),
                clinician_id: "clinician_c".to_string(),
            },
            ClinicianLinkRow {
                id: "clinician_b".to_string(),
                clinician_id: "clinician_c".to_string(),
            },
            ClinicianLinkRow {
                id: "clinician_c".to_string(),
                clinician_id: "clinician_c".to_string(),
            },
        ];

        let (_, connection, _, _) = setup_all(
            "test_clinician_merge_message_translation_in_order",
            MockDataInserts::none().clinicians(),
        )
        .await;

        let mut logger = SyncLogger::start(&connection).unwrap();

        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, true, &mut logger)
            .await
            .unwrap();

        let clinician_link_repo = ClinicianLinkRowRepository::new(&connection);
        let mut clinician_links = clinician_link_repo
            .find_many_by_clinician_id(&"clinician_c")
            .unwrap();

        clinician_links.sort_by_key(|i| i.id.to_owned());
        assert_eq!(clinician_links, expected_clinician_links);

        let (_, connection, _, _) = setup_all(
            "test_clinician_merge_message_translation_in_reverse_order",
            MockDataInserts::none().clinicians(),
        )
        .await;

        sync_records.reverse();
        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();

        integrate_and_translate_sync_buffer(&connection, true, &mut logger)
            .await
            .unwrap();

        let clinician_link_repo = ClinicianLinkRowRepository::new(&connection);
        let mut clinician_links = clinician_link_repo
            .find_many_by_clinician_id(&"clinician_c".to_string())
            .unwrap();

        clinician_links.sort_by_key(|i| i.id.to_owned());
        assert_eq!(clinician_links, expected_clinician_links);
    }
}
