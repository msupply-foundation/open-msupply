use repository::{ItemLinkRow, ItemLinkRowRepository, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use crate::sync::translations::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct PartialLegacyItemRow {
    pub ID: String,
}

pub(crate) struct ItemLinkTranslation {}
impl SyncTranslation for ItemLinkTranslation {
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
        if sync_record.table_name != LegacyTableName::ITEM {
            return Ok(None);
        }

        let data = serde_json::from_str::<PartialLegacyItemRow>(&sync_record.data)?;

        let item_link_repo = ItemLinkRowRepository::new(connection);
        let item_link = item_link_repo.find_one_by_id(&data.ID)?;

        if item_link.is_some() {
            return Ok(None);
        }

        let result = ItemLinkRow {
            id: data.ID.clone(),
            item_id: data.ID,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::ItemLink(result),
        )))
    }
}
