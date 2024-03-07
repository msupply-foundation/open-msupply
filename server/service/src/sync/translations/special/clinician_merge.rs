use repository::{ClinicianLinkRow, ClinicianLinkRowRepository, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use crate::sync::translations::{
    clinician::ClinicianTranslation, PullTranslateResult, SyncTranslation,
};

#[derive(Deserialize)]
pub struct ClinicianMergeMessage {
    #[serde(rename = "mergeIdToKeep")]
    pub merge_id_to_keep: String,
    #[serde(rename = "mergeIdToDelete")]
    pub merge_id_to_delete: String,
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ClinicianMergeTranslation)
}
pub(crate) struct ClinicianMergeTranslation;
impl SyncTranslation for ClinicianMergeTranslation {
    fn table_name(&self) -> &'static str {
        ClinicianTranslation.table_name()
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![]
    }

    fn try_translate_from_merge_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<ClinicianMergeMessage>(&sync_record.data)?;

        let clinician_link_repo = ClinicianLinkRowRepository::new(connection);
        let clinician_links =
            clinician_link_repo.find_many_by_clinician_id(&data.merge_id_to_delete)?;

        if clinician_links.is_empty() {
            return Ok(PullTranslateResult::Ignored(
                "No mergeable clinician links found".to_string(),
            ));
        }

        let indirect_link = clinician_link_repo
            .find_one_by_id(&data.merge_id_to_keep)?
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "Could not find clinician link with id {}",
                    data.merge_id_to_keep
                )
            })?;

        let upsert_records: Vec<ClinicianLinkRow> = clinician_links
            .into_iter()
            .map(|ClinicianLinkRow { id, .. }| ClinicianLinkRow {
                id,
                clinician_id: indirect_link.clinician_id.clone(),
            })
            .collect();

        Ok(PullTranslateResult::upserts(upsert_records))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::{
        sync_status::logger::SyncLogger, synchroniser::integrate_and_translate_sync_buffer,
    };

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, SyncBufferAction, SyncBufferRowRepository,
    };

    #[actix_rt::test]
    async fn test_clinician_merge() {
        let mut sync_records = vec![
            SyncBufferRow {
                record_id: "clinician_b_merge".to_string(),
                table_name: "clinician".to_string(),
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
                table_name: "clinician".to_string(),
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
