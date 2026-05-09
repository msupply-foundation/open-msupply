use repository::{StorageConnection, SyncBufferRow, SyncMessageRowType};

use crate::sync::{
    translations::{
        clinician::ClinicianTranslation,
        special::merge::{
            apply_clinician_merge, build_central_merge_message, MergeMessageBody, MergeOutcome,
        },
        IntegrationOperation, PullTranslateResult, SyncTranslation,
    },
    CentralServerConfig,
};

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ClinicianMergeTranslation)
}
pub(crate) struct ClinicianMergeTranslation;
impl SyncTranslation for ClinicianMergeTranslation {
    fn table_name(&self) -> &str {
        ClinicianTranslation.table_name()
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_merge_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = sync_record.deserialize::<MergeMessageBody>()?;

        let mut ops = match apply_clinician_merge(connection, &data)? {
            MergeOutcome::Operations(ops) => ops,
            MergeOutcome::NothingToDo(reason) => {
                return Ok(PullTranslateResult::Ignored(reason.to_string()))
            }
        };

        if CentralServerConfig::is_central_server() {
            let row = build_central_merge_message(
                "clinician",
                SyncMessageRowType::ClinicianMerge,
                &data,
            )?;
            ops.push(IntegrationOperation::upsert(row));
        }

        Ok(PullTranslateResult::IntegrationOperations(ops))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::{
        synchroniser::integrate_and_translate_sync_buffer,
    };

    use repository::{
        mock::MockDataInserts, test_db::setup_all, ClinicianLinkRow, ClinicianLinkRowRepository,
        SyncAction, SyncBufferRepository, SyncBufferRowInsert, SyncRecordData,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_clinician_merge() {
        let mut sync_records = vec![
            SyncBufferRowInsert {
                record_id: "clinician_b_merge".to_string(),
                table_name: "clinician".to_string(),
                action: SyncAction::Merge,
                data: SyncRecordData(json!({
                    "mergeIdToKeep": "clinician_b",
                    "mergeIdToDelete": "clinician_a"
                })),
                ..SyncBufferRowInsert::default()
            },
            SyncBufferRowInsert {
                record_id: "clinician_c_merge".to_string(),
                table_name: "clinician".to_string(),
                action: SyncAction::Merge,
                data: SyncRecordData(json!({
                    "mergeIdToKeep": "clinician_c",
                    "mergeIdToDelete": "clinician_b"
                })),
                ..SyncBufferRowInsert::default()
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

        SyncBufferRepository::new(&connection)
            .insert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, None, 0)
            .unwrap();

        let clinician_link_repo = ClinicianLinkRowRepository::new(&connection);
        let mut clinician_links = clinician_link_repo
            .find_many_by_clinician_id("clinician_c")
            .unwrap();

        clinician_links.sort_by_key(|i| i.id.to_string());
        assert_eq!(clinician_links, expected_clinician_links);

        let (_, connection, _, _) = setup_all(
            "test_clinician_merge_message_translation_in_reverse_order",
            MockDataInserts::none().clinicians(),
        )
        .await;

        sync_records.reverse();
        SyncBufferRepository::new(&connection)
            .insert_many(&sync_records)
            .unwrap();

        integrate_and_translate_sync_buffer(&connection, None, 0)
            .unwrap();

        let clinician_link_repo = ClinicianLinkRowRepository::new(&connection);
        let mut clinician_links = clinician_link_repo
            .find_many_by_clinician_id("clinician_c")
            .unwrap();

        clinician_links.sort_by_key(|i| i.id.to_string());
        assert_eq!(clinician_links, expected_clinician_links);
    }
}
