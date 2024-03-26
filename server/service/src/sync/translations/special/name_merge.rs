use repository::{
    EqualFilter, NameLinkRow, NameLinkRowRepository, NameStoreJoinFilter, NameStoreJoinRepository,
    Pagination, StorageConnection, StoreRepository, SyncBufferRow,
};

use serde::Deserialize;

use crate::sync::translations::{
    IntegrationRecords, LegacyTableName, PullDeleteRecord, PullDeleteRecordTable, PullDependency,
    PullUpsertRecord, SyncTranslation,
};

#[derive(Deserialize)]
pub struct NameMergeMessage {
    #[serde(rename = "mergeIdToKeep")]
    pub merge_id_to_keep: String,
    #[serde(rename = "mergeIdToDelete")]
    pub merge_id_to_delete: String,
}

pub(crate) struct NameMergeTranslation {}
impl SyncTranslation for NameMergeTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::NAME,
            dependencies: vec![],
        }
    }

    fn try_translate_pull_merge(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if sync_record.table_name != LegacyTableName::NAME {
            return Ok(None);
        }

        let data = serde_json::from_str::<NameMergeMessage>(&sync_record.data)?;

        let name_link_repo = NameLinkRowRepository::new(connection);
        let name_links = name_link_repo.find_many_by_name_id(&data.merge_id_to_delete)?;
        if name_links.len() == 0 {
            return Ok(None);
        }
        let indirect_link = name_link_repo
            .find_one_by_id(&data.merge_id_to_keep)?
            .ok_or(anyhow::anyhow!(
                "Could not find name link with id {}",
                data.merge_id_to_keep
            ))?;

        let upserts = name_links
            .into_iter()
            .map(|NameLinkRow { id, .. }| {
                PullUpsertRecord::NameLink(NameLinkRow {
                    id,
                    name_id: indirect_link.name_id.clone(),
                })
            })
            .collect();

        let name_store_join_repo = NameStoreJoinRepository::new(connection);
        let name_store_joins_for_delete = name_store_join_repo.query(Some(
            NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(&data.merge_id_to_delete)),
        ))?;
        let name_store_joins_for_keep = name_store_join_repo.query(Some(
            NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(&data.merge_id_to_keep)),
        ))?;
        let mut deletes: Vec<PullDeleteRecord> = vec![];

        // We need to delete the name_store_joins that are no longer needed after the merge
        // Situation A: ("Joined to" meaning store->nsj->name_link->name)
        // storeA joined to nameK
        // storeA joined to nameD
        // storeB joined to nameD
        // nameD merged into nameK
        // storeA joined to nameK
        // storeA joined to nameK (delete this join to avoid showing twice in lists seemingly as a duplicate)
        // storeB joined to nameK (make sure we don't accidentally delete this one, or visibility of nameK will be lost for storeB)
        name_store_joins_for_delete.iter().for_each(|nsj_delete| {
            if name_store_joins_for_keep.iter().any(|nsj_keep| {
                nsj_keep.name_store_join.store_id == nsj_delete.name_store_join.store_id
            }) {
                deletes.push(PullDeleteRecord {
                    id: nsj_delete.name_store_join.id.clone(),
                    table: PullDeleteRecordTable::NameStoreJoin,
                });
            }
        });

        // Situation B:
        // storeK.name_id == nameK.id
        // storeK joined to nameD
        // nameD merged into nameK
        // storeK joined to nameK (delete the join before this happens, stores shouldn't be visible to themselves)
        let store_repo = StoreRepository::new(connection);

        let stores = store_repo.query(Pagination::new(), None, None)?; // If there were thousands of stores this would probably be bad, at a certain scale theres probably a smarter DB query we could be making.
        name_store_joins_for_delete
            .into_iter()
            .for_each(|nsj_delete| {
                if stores
                    .iter()
                    .any(|store| store.store_row.id == nsj_delete.name_store_join.store_id)
                {
                    deletes.push(PullDeleteRecord {
                        id: nsj_delete.name_store_join.id,
                        table: PullDeleteRecordTable::NameStoreJoin,
                    });
                }
            });

        Ok(Some(IntegrationRecords { upserts, deletes }))
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
    async fn test_name_merge() {
        let mut sync_records = vec![
            SyncBufferRow {
                record_id: "name_b".to_string(),
                table_name: LegacyTableName::NAME.to_string(),
                action: SyncBufferAction::Merge,
                data: r#"{
                        "mergeIdToKeep": "name_b",
                        "mergeIdToDelete": "name_a"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
            SyncBufferRow {
                record_id: "name_c".to_string(),
                table_name: LegacyTableName::NAME.to_string(),
                action: SyncBufferAction::Merge,
                data: r#"{
                      "mergeIdToKeep": "name_c",
                      "mergeIdToDelete": "name_b"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
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
        let mut logger = SyncLogger::start(&connection).unwrap();

        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, true, &mut logger)
            .await
            .unwrap();

        let name_link_repo = NameLinkRowRepository::new(&connection);
        let mut name_links = name_link_repo
            .find_many_by_name_id(&"name_c".to_string())
            .unwrap();

        name_links.sort_by_key(|i| i.id.to_owned());
        assert_eq!(name_links, expected_name_links);
        let (_, connection, _, _) = setup_all(
            "test_name_merge_message_translation_in_reverse_order",
            MockDataInserts::none().units().names(),
        )
        .await;
        sync_records.reverse();
        let mut logger = SyncLogger::start(&connection).unwrap();

        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, true, &mut logger)
            .await
            .unwrap();

        let name_link_repo = NameLinkRowRepository::new(&connection);
        let mut name_links = name_link_repo
            .find_many_by_name_id(&"name_c".to_string())
            .unwrap();

        name_links.sort_by_key(|i| i.id.to_owned());
        assert_eq!(name_links, expected_name_links);

        // When 2 names are merged, we clean up name_store_joins to ensure there only remains 1 NSJ for each store that
        // had the "deleted" name visible.
        // e.g. for nameD and nameK where nameD is merged into nameK:
        // storeA has just nameD visible, so we leave the NSJ and rely on the name_link being updated correctly in the merge process
        // storeB has both nameD and nameK visible. After the merge, the store has effectively 2 identical name_store_joins pointing to nameK. Thus we delete the name_store_join pointing to nameD.
        // This prevents names (nameK in this case) showing twice in lists after a merge.
        // What's more, a store shouldn't become visible to itself! e.g. if storeA above is actually nameK.
        let (_, connection, _, _) = setup_all(
            "test_name_merge_message_translation_removes_duplicate_name_store_joins",
            MockDataInserts::none()
                .units()
                .names()
                .stores()
                .name_store_joins(),
        )
        .await;
        let mut logger = SyncLogger::start(&connection).unwrap();
        let name_store_join_repo = NameStoreJoinRepository::new(&connection);
        let name_store_joins = name_store_join_repo
            .query(Some(
                NameStoreJoinFilter::new()
                    .name_id(EqualFilter::equal_to(&"name_store_a".to_string())),
            ))
            .unwrap();
        assert_eq!(name_store_joins.len(), 1); // Ensure the test data expected is correct

        // panic!("Stop here so i can inspect the sql DB state");

        let sync_records = vec![
            SyncBufferRow {
                record_id: "name_store_b_merge".to_string(),
                table_name: LegacyTableName::NAME.to_string(),
                action: SyncBufferAction::Merge,
                data: r#"{
                        "mergeIdToKeep": "name_store_b",
                        "mergeIdToDelete": "name_store_a"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
            SyncBufferRow {
                record_id: "name_store_c_merge".to_string(),
                table_name: LegacyTableName::NAME.to_string(),
                action: SyncBufferAction::Merge,
                data: r#"{
                      "mergeIdToKeep": "name_store_c",
                      "mergeIdToDelete": "name_store_b"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
        ];
        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, true, &mut logger)
            .await
            .unwrap();

        let name_store_joins = name_store_join_repo
            .query(Some(
                NameStoreJoinFilter::new()
                    .name_id(EqualFilter::equal_to(&"name_store_a".to_string())),
            ))
            .unwrap();
        assert_eq!(name_store_joins.len(), 0);

        let name_store_joins = name_store_join_repo
            .query(Some(
                NameStoreJoinFilter::new()
                    .name_id(EqualFilter::equal_to(&"name_store_b".to_string())),
            ))
            .unwrap();
        assert_eq!(name_store_joins.len(), 0);

        let name_store_joins = name_store_join_repo
            .query(Some(
                NameStoreJoinFilter::new()
                    .name_id(EqualFilter::equal_to(&"name_store_c".to_string())),
            ))
            .unwrap();
        assert_eq!(name_store_joins.len(), 1);
    }
}
