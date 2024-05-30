use repository::{
    EqualFilter, NameLinkRow, NameLinkRowRepository, NameRowDelete, NameStoreJoinFilter,
    NameStoreJoinRepository, NameStoreJoinRow, NameStoreJoinRowDelete, StorageConnection,
    StoreFilter, StoreRepository, SyncBufferRow,
};

use serde::Deserialize;

use crate::sync::translations::{
    name::NameTranslation, IntegrationOperation, PullTranslateResult, SyncTranslation,
};

#[derive(Deserialize)]
pub struct NameMergeMessage {
    #[serde(rename = "mergeIdToKeep")]
    pub merge_id_to_keep: String,
    #[serde(rename = "mergeIdToDelete")]
    pub merge_id_to_delete: String,
}

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
        let data = serde_json::from_str::<NameMergeMessage>(&sync_record.data)?;

        let name_link_repo = NameLinkRowRepository::new(connection);
        let name_links = name_link_repo.find_many_by_name_id(&data.merge_id_to_delete)?;
        if name_links.is_empty() {
            return Ok(PullTranslateResult::Ignored(
                "No mergeable name links found".to_string(),
            ));
        }
        let indirect_link = name_link_repo
            .find_one_by_id(&data.merge_id_to_keep)?
            .ok_or(anyhow::anyhow!(
                "Could not find name link with id {}",
                data.merge_id_to_keep
            ))?;

        let mut operations: Vec<IntegrationOperation> = name_links
            .into_iter()
            .map(|NameLinkRow { id, .. }| {
                IntegrationOperation::upsert(NameLinkRow {
                    id,
                    name_id: indirect_link.name_id.clone(),
                })
            })
            .collect();
        // delete the merged name
        operations.push(IntegrationOperation::delete(NameRowDelete(
            data.merge_id_to_delete.clone(),
        )));

        let name_store_join_repo = NameStoreJoinRepository::new(connection);
        let name_store_joins_for_delete = name_store_join_repo.query_by_filter(
            NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(&data.merge_id_to_delete)),
        )?;
        let name_store_joins_for_keep = name_store_join_repo.query_by_filter(
            NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(&data.merge_id_to_keep)),
        )?;

        // We need to delete the name_store_joins that are no longer needed after the merge
        // Situation A: ("Joined to" meaning store->nsj->name_link->name)
        // storeA joined to nameK
        // storeA joined to nameD
        // storeB joined to nameD
        // nameD merged into nameK
        // storeA joined to nameK
        // storeA joined to nameK (delete this join to avoid showing twice in lists seemingly as a duplicate)
        // storeB joined to nameK (make sure we don't accidentally delete this one, or visibility of nameK will be lost for storeB)
        //
        // We must also consider nsj.name_is_customer and nsj.name_is_supplier.
        // The remaining NSJ that we keep must logically OR each of these fields with the corresponding field in the deleted NSJs.
        // We prefer making the name visible to stores rather than losing visibility as it allows users to still make invoices and orders
        let store_repo = StoreRepository::new(connection);
        let store = store_repo
            .query_one(StoreFilter::new().name_id(EqualFilter::equal_to(&data.merge_id_to_keep)))?;
        let mut deletes = name_store_joins_for_delete
            .iter()
            .filter_map(|nsj_delete| {
                // delete nsj_delete if it points to the store that belongs to the "keep" name. Avoids:
                // storeK.name_id == nameK.id
                // storeK joined to nameD
                // nameD merged into nameK
                // storeK joined to nameK (delete the join before this happens, stores shouldn't be visible to themselves)
                if let Some(store) = &store {
                    if nsj_delete.name_store_join.store_id == store.store_row.id {
                        return Some(IntegrationOperation::delete(NameStoreJoinRowDelete(
                            nsj_delete.name_store_join.id.clone(),
                        )));
                    }
                }

                // Delete duplicate name_store_joins. Avoids:
                // ("joined to" meaning store->nsj->name_link->name)
                // storeA joined to nameK
                // storeA joined to nameD
                // storeB joined to nameD
                // nameD merged into nameK
                // storeA joined to nameK
                // storeA joined to nameK (delete this join to avoid showing twice in lists seemingly as a duplicate)
                // storeB joined to nameK (make sure we don't accidentally delete this one, or visibility of nameK will be lost for storeB)
                if let Some(nsj_keep) = name_store_joins_for_keep.iter().find(|nsj_keep| {
                    nsj_keep.name_store_join.store_id == nsj_delete.name_store_join.store_id
                }) {
                    // We must also consider nsj_delete.name_is_customer and nsj_delete.name_is_supplier.
                    // The remaining NSJ that we keep must logically OR each of these fields with the corresponding field in the deleted NSJs.
                    // We prefer making the name visible to stores rather than losing visibility as it allows users to still make invoices and orders
                    if (!nsj_keep.name_store_join.name_is_customer
                        && nsj_keep.name_store_join.name_is_customer)
                        || (!nsj_keep.name_store_join.name_is_supplier
                            && nsj_keep.name_store_join.name_is_supplier)
                    {
                        operations.push(IntegrationOperation::upsert(NameStoreJoinRow {
                            id: nsj_keep.name_store_join.id.clone(),
                            name_link_id: nsj_keep.name_store_join.name_link_id.clone(),
                            store_id: nsj_keep.name_store_join.store_id.clone(),
                            name_is_customer: nsj_keep.name_store_join.name_is_customer
                                || nsj_delete.name_store_join.name_is_customer,
                            name_is_supplier: nsj_keep.name_store_join.name_is_supplier
                                || nsj_delete.name_store_join.name_is_supplier,
                        }));
                    }

                    return Some(IntegrationOperation::delete(NameStoreJoinRowDelete(
                        nsj_delete.name_store_join.id.clone(),
                    )));
                }

                None
            })
            .collect::<Vec<_>>();
        operations.append(&mut deletes);

        Ok(PullTranslateResult::IntegrationOperations(operations))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::synchroniser::integrate_and_translate_sync_buffer;

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, SyncAction, SyncBufferRowRepository,
    };

    #[actix_rt::test]
    async fn test_name_merge() {
        let mut sync_records = vec![
            SyncBufferRow {
                record_id: "name_b".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
                data: r#"{
                        "mergeIdToKeep": "name_b",
                        "mergeIdToDelete": "name_a"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
            SyncBufferRow {
                record_id: "name_c".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
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

        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, None, None).unwrap();

        let name_link_repo = NameLinkRowRepository::new(&connection);
        let mut name_links = name_link_repo.find_many_by_name_id("name_c").unwrap();

        name_links.sort_by_key(|i| i.id.to_owned());
        assert_eq!(name_links, expected_name_links);
        let (_, connection, _, _) = setup_all(
            "test_name_merge_message_translation_in_reverse_order",
            MockDataInserts::none().units().names(),
        )
        .await;
        sync_records.reverse();

        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, None, None).unwrap();

        let name_link_repo = NameLinkRowRepository::new(&connection);
        let mut name_links = name_link_repo.find_many_by_name_id("name_c").unwrap();

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
        let name_store_join_repo = NameStoreJoinRepository::new(&connection);

        let count_name_store_join = |id: &str| -> usize {
            name_store_join_repo
                .query(Some(
                    NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(&id.to_string())),
                ))
                .unwrap()
                .len()
        };

        // Ensure the test data is what was expected as when written
        assert_eq!(count_name_store_join(&"name_a"), 3);
        assert_eq!(count_name_store_join(&"name2"), 1);
        assert_eq!(count_name_store_join(&"name3"), 2);
        assert_eq!(count_name_store_join(&"name_store_a"), 1);

        let sync_records = vec![
            SyncBufferRow {
                record_id: "name3_merge".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
                data: r#"{
                        "mergeIdToKeep": "name2",
                        "mergeIdToDelete": "name3"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
            SyncBufferRow {
                record_id: "name2_merge".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
                data: r#"{
                      "mergeIdToKeep": "name_a",
                      "mergeIdToDelete": "name2"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
            SyncBufferRow {
                // name_a is visible to name_store_a. This merge is test if the name_store_join is deleted, rather than letting the store have it's own name visible
                record_id: "name_a_merge".to_string(),
                table_name: "name".to_string(),
                action: SyncAction::Merge,
                data: r#"{
                      "mergeIdToKeep": "name_store_a",
                      "mergeIdToDelete": "name_a"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
        ];
        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();

        integrate_and_translate_sync_buffer(&connection, None, None).unwrap();

        assert_eq!(count_name_store_join(&"name_a"), 0);
        assert_eq!(count_name_store_join(&"name2"), 0);
        assert_eq!(count_name_store_join(&"name3"), 0);
        assert_eq!(count_name_store_join(&"name_store_a"), 3);
    }
}
