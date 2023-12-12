use repository::{
    ItemLinkRow, ItemLinkRowRepository, StorageConnection, SyncBufferAction, SyncBufferRow,
};

use serde::Deserialize;

use crate::sync::translations::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct ItemMergeMessage {
    pub mergeIdToKeep: String,
    pub mergeIdToDelete: String,
}

// Conceptually this isn't a translation, so the abstraction should probably be changed or this doesn't belong here
pub(crate) struct ItemMergeTranslation {}
impl SyncTranslation for ItemMergeTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::ITEM,
            dependencies: vec![],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if sync_record.table_name != LegacyTableName::ITEM
            || sync_record.action != SyncBufferAction::Merge
        {
            return Ok(None);
        }

        let data = serde_json::from_str::<ItemMergeMessage>(&sync_record.data)?;

        let item_link_repo = ItemLinkRowRepository::new(connection);
        let item_links = item_link_repo.find_many_by_item_id(&data.mergeIdToDelete)?;

        if item_links.len() == 0 {
            return Ok(None);
        }

        let upsert_records = dbg!(item_links)
            .into_iter()
            .map(|ItemLinkRow { id, .. }| {
                PullUpsertRecord::ItemLink(ItemLinkRow {
                    id,
                    item_id: data.mergeIdToKeep.clone(),
                })
            })
            .collect();

        Ok(Some(IntegrationRecords::from_upserts(upsert_records)))
    }
}

