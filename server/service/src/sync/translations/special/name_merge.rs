use repository::{StorageConnection, SyncBufferRow, SyncMessageRowType};

use crate::sync::{
    translations::{
        name::NameTranslation,
        special::merge::{
            apply_name_merge, build_central_merge_message, MergeMessageBody, MergeOutcome,
        },
        IntegrationOperation, PullTranslateResult, SyncTranslation,
    },
    CentralServerConfig,
};

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameMergeTranslation)
}
pub(crate) struct NameMergeTranslation;
impl SyncTranslation for NameMergeTranslation {
    fn table_name(&self) -> &str {
        NameTranslation.table_name()
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

        let mut ops = match apply_name_merge(connection, &data)? {
            MergeOutcome::Operations(ops) => ops,
            MergeOutcome::NothingToDo(reason) => {
                return Ok(PullTranslateResult::Ignored(reason.to_string()))
            }
        };

        // On OMS central, also emit a `sync_message` so v7 remotes can replay
        // the same merge against their local link tables. The link rewrite
        // above already keeps central itself consistent — the message is purely
        // for fanout, and the post-sync processor skips it when running on
        // central.
        if CentralServerConfig::is_central_server() {
            let row = build_central_merge_message("name", SyncMessageRowType::NameMerge, &data)?;
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
        mock::MockDataInserts, test_db::setup_all, EqualFilter, NameLinkRow, NameLinkRowRepository,
        NameStoreJoinFilter, NameStoreJoinRepository, SyncAction, SyncBufferRepository,
        SyncBufferRowInsert, SyncRecordData,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_name_merge() {
        let mut sync_records = vec![
            SyncBufferRowInsert {
                record_id: "name_b".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
                data: SyncRecordData(json!({
                    "mergeIdToKeep": "name_b",
                    "mergeIdToDelete": "name_a"
                })),
                ..SyncBufferRowInsert::default()
            },
            SyncBufferRowInsert {
                record_id: "name_c".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
                data: SyncRecordData(json!({
                    "mergeIdToKeep": "name_c",
                    "mergeIdToDelete": "name_b"
                })),
                ..SyncBufferRowInsert::default()
            },
        ];

        let expected_name_links = vec![
            NameLinkRow {
                id: "name_a".to_string(),
                name_id: "name_c".to_string(),
            },
            NameLinkRow {
                id: "name_b".to_string(),
                name_id: "name_c".to_string(),
            },
            NameLinkRow {
                id: "name_c".to_string(),
                name_id: "name_c".to_string(),
            },
        ];

        let (_, connection, _, _) = setup_all(
            "test_name_merge_message_translation_in_order",
            MockDataInserts::none().units().names(),
        )
        .await;

        SyncBufferRepository::new(&connection)
            .insert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, None, 0)
            .unwrap();

        let name_link_repo = NameLinkRowRepository::new(&connection);
        let mut name_links = name_link_repo.find_many_by_name_id("name_c").unwrap();

        name_links.sort_by_key(|i| i.id.to_string());
        assert_eq!(name_links, expected_name_links);
        let (_, connection, _, _) = setup_all(
            "test_name_merge_message_translation_in_reverse_order",
            MockDataInserts::none().units().names(),
        )
        .await;
        sync_records.reverse();

        SyncBufferRepository::new(&connection)
            .insert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, None, 0)
            .unwrap();

        let name_link_repo = NameLinkRowRepository::new(&connection);
        let mut name_links = name_link_repo.find_many_by_name_id("name_c").unwrap();

        name_links.sort_by_key(|i| i.id.to_string());
        assert_eq!(name_links, expected_name_links);

        // When 2 names are merged, we clean up name_store_joins to ensure there only remains 1 NSJ for each store that
        // had the "deleted" name visible.
        // e.g. for nameD and nameK where nameD is merged into nameK:
        // storeA has just nameD visible, so we leave the NSJ and rely on the name_link being updated correctly in the merge process
        // storeB has both nameD and nameK visible. After the merge, the store has effectively 2 identical name_store_joins pointing to nameK. Thus we delete the name_store_join pointing to nameD.
        // This prevents names (nameK in this case) showing twice in lists after a merge.
        // What's more, a store shouldn't become visible to itself! e.g. if storeA above is actually nameK.
        let (_, connection, _, _) = setup_all(
            "test_name_merge_message_translation_removes_duplicate_namesj",
            MockDataInserts::none()
                .units()
                .names()
                .stores()
                .name_store_joins(),
        )
        .await;
        let name_store_join_repo = NameStoreJoinRepository::new(&connection);

        let count_name_store_join = |id: &str| -> usize {
            name_store_join_repo
                .query(Some(
                    NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(id.to_string())),
                ))
                .unwrap()
                .len()
        };

        // Ensure the test data is what was expected as when written
        assert_eq!(count_name_store_join("name_a"), 3);
        assert_eq!(count_name_store_join("name2"), 1);
        assert_eq!(count_name_store_join("name3"), 2);
        assert_eq!(count_name_store_join("name_store_a"), 1);

        let sync_records = vec![
            SyncBufferRowInsert {
                record_id: "name3_merge".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
                data: SyncRecordData(json!({
                    "mergeIdToKeep": "name2",
                    "mergeIdToDelete": "name3"
                })),
                ..SyncBufferRowInsert::default()
            },
            SyncBufferRowInsert {
                record_id: "name2_merge".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
                data: SyncRecordData(json!({
                    "mergeIdToKeep": "name_a",
                    "mergeIdToDelete": "name2"
                })),
                ..SyncBufferRowInsert::default()
            },
            SyncBufferRowInsert {
                // name_a is visible to name_store_a. This merge is test if the name_store_join is deleted, rather than letting the store have it's own name visible
                record_id: "name_a_merge".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
                data: SyncRecordData(json!({
                    "mergeIdToKeep": "name_store_a",
                    "mergeIdToDelete": "name_a"
                })),
                ..SyncBufferRowInsert::default()
            },
        ];
        SyncBufferRepository::new(&connection)
            .insert_many(&sync_records)
            .unwrap();

        integrate_and_translate_sync_buffer(&connection, None, 0)
            .unwrap();

        assert_eq!(count_name_store_join("name_a"), 0);
        assert_eq!(count_name_store_join("name2"), 0);
        assert_eq!(count_name_store_join("name3"), 0);
        assert_eq!(count_name_store_join("name_store_a"), 3);
    }
}
