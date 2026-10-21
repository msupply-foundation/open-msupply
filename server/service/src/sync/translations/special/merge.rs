use chrono::Utc;
use repository::{
    ChangelogTableName, ClinicianLinkRow, ClinicianLinkRowRepository, EqualFilter, ItemLinkRow,
    ItemLinkRowRepository, NameLinkRow, NameLinkRowRepository, NameRowDelete, NameStoreJoinFilter,
    NameStoreJoinRepository, NameStoreJoinRow, NameStoreJoinRowDelete, StorageConnection,
    StoreFilter, StoreRepository, SyncMessageRow, SyncMessageRowStatus, SyncMessageRowType,
};
use serde::{Deserialize, Serialize};

use crate::sync::translations::IntegrationOperation;

/// Wire format of the legacy mSupply sync buffer Merge records.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeMessageBody {
    pub merge_id_to_keep: String,
    pub merge_id_to_delete: String,
}

/// Body stored in `sync_message.body` for `SyncMessageRowType::Merge` messages.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeSyncMessageBody {
    pub table_name: ChangelogTableName,
    pub merge_id_to_keep: String,
    pub merge_id_to_delete: String,
}

pub(crate) enum MergeOutcome {
    Operations(Vec<IntegrationOperation>),
    NothingToDo(&'static str),
}

/// Build the `sync_message` row that OMS central emits so v7 remotes can
/// replay the merge. The deterministic id makes re-processing idempotent.
pub(crate) fn build_central_merge_message(
    table_name: ChangelogTableName,
    data: &MergeMessageBody,
) -> Result<SyncMessageRow, anyhow::Error> {
    let id = format!(
        "{}_merge_{}_{}",
        table_name, data.merge_id_to_keep, data.merge_id_to_delete
    );
    let body = serde_json::to_string(&MergeSyncMessageBody {
        table_name,
        merge_id_to_keep: data.merge_id_to_keep.clone(),
        merge_id_to_delete: data.merge_id_to_delete.clone(),
    })?;
    Ok(SyncMessageRow {
        id,
        to_store_id: None,
        from_store_id: None,
        body,
        created_datetime: Utc::now().naive_utc(),
        status: SyncMessageRowStatus::New,
        r#type: SyncMessageRowType::Merge,
        error_message: None,
    })
}

/// Dispatch a merge from a `SyncMessageRowType::Merge` body to the appropriate
/// apply function based on `body.table_name`.
pub(crate) fn apply_merge(
    connection: &StorageConnection,
    body: &MergeSyncMessageBody,
) -> Result<MergeOutcome, anyhow::Error> {
    let data = MergeMessageBody {
        merge_id_to_keep: body.merge_id_to_keep.clone(),
        merge_id_to_delete: body.merge_id_to_delete.clone(),
    };
    match body.table_name {
        ChangelogTableName::Name => apply_name_merge(connection, &data),
        ChangelogTableName::Item => apply_item_merge(connection, &data),
        ChangelogTableName::Clinician => apply_clinician_merge(connection, &data),
        _ => Err(anyhow::anyhow!(
            "Unsupported merge table: {:?}",
            body.table_name
        )),
    }
}

pub(crate) fn apply_name_merge(
    connection: &StorageConnection,
    data: &MergeMessageBody,
) -> Result<MergeOutcome, anyhow::Error> {
    let name_link_repo = NameLinkRowRepository::new(connection);
    let name_links = name_link_repo.find_many_by_name_id(&data.merge_id_to_delete)?;
    if name_links.is_empty() {
        return Ok(MergeOutcome::NothingToDo("No mergeable name links found"));
    }
    let indirect_link = name_link_repo
        .find_one_by_id(&data.merge_id_to_keep)?
        .ok_or_else(|| {
            anyhow::anyhow!("Could not find name link with id {}", data.merge_id_to_keep)
        })?;

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
        NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(data.merge_id_to_delete.clone())),
    )?;
    let name_store_joins_for_keep = name_store_join_repo.query_by_filter(
        NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(data.merge_id_to_keep.clone())),
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
    // The kept join is a customer or supplier if either join was, and active if
    // either was, so the store keeps seeing the name for invoices and orders
    let store_repo = StoreRepository::new(connection);
    let store = store_repo.query_one(
        StoreFilter::new().name_id(EqualFilter::equal_to(data.merge_id_to_keep.clone())),
    )?;
    let mut deletes = name_store_joins_for_delete
        .iter()
        .filter_map(|nsj_delete| {
            // delete nsj_delete if it points to the store that belongs to the "keep" name. Avoids:
            // storeK.name_id == nameK.id
            // storeK joined to nameD
            // nameD merged into nameK
            // storeK joined to nameK (delete the join before this happens, stores shouldn't be visible to themselves)
            if let Some(store) = &store
                && nsj_delete.name_store_join.store_id == store.store_row.id
            {
                return Some(IntegrationOperation::delete(NameStoreJoinRowDelete(
                    nsj_delete.name_store_join.id.clone(),
                )));
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
                // Combine the two joins into the kept one (see above)
                if (!nsj_keep.name_store_join.name_is_customer
                    && nsj_delete.name_store_join.name_is_customer)
                    || (!nsj_keep.name_store_join.name_is_supplier
                        && nsj_delete.name_store_join.name_is_supplier)
                    || (nsj_keep.name_store_join.inactive && !nsj_delete.name_store_join.inactive)
                {
                    operations.push(IntegrationOperation::upsert(NameStoreJoinRow {
                        name_is_customer: nsj_keep.name_store_join.name_is_customer
                            || nsj_delete.name_store_join.name_is_customer,
                        name_is_supplier: nsj_keep.name_store_join.name_is_supplier
                            || nsj_delete.name_store_join.name_is_supplier,
                        inactive: nsj_keep.name_store_join.inactive
                            && nsj_delete.name_store_join.inactive,
                        ..nsj_keep.name_store_join.clone()
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

    Ok(MergeOutcome::Operations(operations))
}

pub(crate) fn apply_item_merge(
    connection: &StorageConnection,
    data: &MergeMessageBody,
) -> Result<MergeOutcome, anyhow::Error> {
    let item_link_repo = ItemLinkRowRepository::new(connection);
    let item_links = item_link_repo.find_many_by_item_id(&data.merge_id_to_delete)?;
    if item_links.is_empty() {
        return Ok(MergeOutcome::NothingToDo("No mergeable item links found"));
    }
    let indirect_link = item_link_repo
        .find_one_by_id(&data.merge_id_to_keep)?
        .ok_or_else(|| {
            anyhow::anyhow!("Could not find item link with id {}", data.merge_id_to_keep)
        })?;

    let operations = item_links
        .into_iter()
        .map(|ItemLinkRow { id, .. }| {
            IntegrationOperation::upsert(ItemLinkRow {
                id,
                item_id: indirect_link.item_id.clone(),
            })
        })
        .collect();

    Ok(MergeOutcome::Operations(operations))
}

pub(crate) fn apply_clinician_merge(
    connection: &StorageConnection,
    data: &MergeMessageBody,
) -> Result<MergeOutcome, anyhow::Error> {
    let clinician_link_repo = ClinicianLinkRowRepository::new(connection);
    let clinician_links =
        clinician_link_repo.find_many_by_clinician_id(&data.merge_id_to_delete)?;
    if clinician_links.is_empty() {
        return Ok(MergeOutcome::NothingToDo(
            "No mergeable clinician links found",
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

    let operations = clinician_links
        .into_iter()
        .map(|ClinicianLinkRow { id, .. }| {
            IntegrationOperation::upsert(ClinicianLinkRow {
                id,
                clinician_id: indirect_link.clinician_id.clone(),
            })
        })
        .collect();

    Ok(MergeOutcome::Operations(operations))
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    /// A kept join is active if either merged join was: a store that could see
    /// either patient still sees the merged one
    #[actix_rt::test]
    async fn name_merge_keeps_join_active_if_either_is() {
        let (_, connection, _, _) = setup_all(
            "name_merge_keeps_join_active_if_either_is",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let join = |id: &str, name_id: &str, store_id: &str, inactive: bool| NameStoreJoinRow {
            id: id.to_string(),
            name_id: name_id.to_string(),
            store_id: store_id.to_string(),
            name_is_customer: true,
            name_is_supplier: false,
            inactive,
        };
        // store_a: the kept patient's join is inactive, the merged one's active
        let keep_in_store_a = join("keep_in_store_a", "testId", "store_a", true);
        let delete_in_store_a = join("delete_in_store_a", "patient2", "store_a", false);
        // store_b: both inactive
        let keep_in_store_b = join("keep_in_store_b", "testId", "store_b", true);
        let delete_in_store_b = join("delete_in_store_b", "patient2", "store_b", true);
        let repo = NameStoreJoinRepository::new(&connection);
        for row in [
            &keep_in_store_a,
            &delete_in_store_a,
            &keep_in_store_b,
            &delete_in_store_b,
        ] {
            repo.upsert_one_without_changelog(row).unwrap();
        }

        let MergeOutcome::Operations(operations) = apply_name_merge(
            &connection,
            &MergeMessageBody {
                merge_id_to_keep: "testId".to_string(),
                merge_id_to_delete: "patient2".to_string(),
            },
        )
        .unwrap() else {
            panic!("expected merge operations");
        };

        // IntegrationOperation has no PartialEq, so compare the debug output
        let operations: Vec<String> = operations.iter().map(|op| format!("{op:?}")).collect();
        let join_upserts: Vec<&String> = operations
            .iter()
            .filter(|op| op.starts_with("Upsert(NameStoreJoinRow "))
            .collect();
        assert_eq!(
            join_upserts,
            vec![&format!(
                "{:?}",
                IntegrationOperation::upsert(NameStoreJoinRow {
                    inactive: false,
                    ..keep_in_store_a
                })
            )]
        );
        for deleted in ["delete_in_store_a", "delete_in_store_b"] {
            let delete = format!(
                "{:?}",
                IntegrationOperation::delete(NameStoreJoinRowDelete(deleted.to_string()))
            );
            assert!(operations.contains(&delete), "{delete} in {operations:?}");
        }
    }
}
