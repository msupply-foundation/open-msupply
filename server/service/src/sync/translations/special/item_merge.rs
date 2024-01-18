use repository::{ItemLinkRow, ItemLinkRowRepository, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use crate::sync::translations::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

#[derive(Deserialize)]
pub struct ItemMergeMessage {
    #[serde(rename = "mergeIdToKeep")]
    pub merge_id_to_keep: String,
    #[serde(rename = "mergeIdToDelete")]
    pub merge_id_to_delete: String,
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

    fn try_translate_pull_merge(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if sync_record.table_name != LegacyTableName::ITEM {
            return Ok(None);
        }

        let data = serde_json::from_str::<ItemMergeMessage>(&sync_record.data)?;

        let item_link_repo = ItemLinkRowRepository::new(connection);
        let item_links = item_link_repo.find_many_by_item_id(&data.merge_id_to_delete)?;
        if item_links.len() == 0 {
            return Ok(None);
        }
        let indirect_link = item_link_repo
            .find_one_by_id(&data.merge_id_to_keep)?
            .ok_or(anyhow::anyhow!(
                "Could not find item link with id {}",
                data.merge_id_to_keep
            ))?;

        let upsert_records: Vec<PullUpsertRecord> = item_links
            .into_iter()
            .map(|ItemLinkRow { id, .. }| {
                PullUpsertRecord::ItemLink(ItemLinkRow {
                    id,
                    item_id: indirect_link.item_id.clone(),
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
        mock::MockDataInserts, test_db::setup_all, ItemLinkRowRepository, SyncBufferAction,
        SyncBufferRow, SyncBufferRowRepository,
    };

    #[actix_rt::test]
    async fn test_item_merge() {
        // util::init_logger(util::LogLevel::Info);
        let mut sync_records = vec![
            SyncBufferRow {
                record_id: "item_b_merge".to_string(),
                table_name: LegacyTableName::ITEM.to_string(),
                action: SyncBufferAction::Merge,
                data: r#"{
                        "mergeIdToKeep": "item_b",
                        "mergeIdToDelete": "item_a"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
            SyncBufferRow {
                record_id: "item_c_merge".to_string(),
                table_name: LegacyTableName::ITEM.to_string(),
                action: SyncBufferAction::Merge,
                data: r#"{
                      "mergeIdToKeep": "item_c",
                      "mergeIdToDelete": "item_b"
                    }"#
                .to_string(),
                ..SyncBufferRow::default()
            },
        ];

        let expected_item_links = vec![
            ItemLinkRow {
                id: "item_a".to_string(),
                item_id: "item_c".to_string(),
            },
            ItemLinkRow {
                id: "item_b".to_string(),
                item_id: "item_c".to_string(),
            },
            ItemLinkRow {
                id: "item_c".to_string(),
                item_id: "item_c".to_string(),
            },
        ];

        let (_, connection, _, _) = setup_all(
            "test_item_merge_message_translation_in_order",
            MockDataInserts::none().units().items(),
        )
        .await;

        let mut logger = SyncLogger::start(&connection).unwrap();

        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();
        integrate_and_translate_sync_buffer(&connection, true, &mut logger)
            .await
            .unwrap();

        let item_link_repo = ItemLinkRowRepository::new(&connection);
        let mut item_links = item_link_repo
            .find_many_by_item_id(&"item_c".to_string())
            .unwrap();

        item_links.sort_by_key(|i| i.id.to_owned());
        assert_eq!(item_links, expected_item_links);

        let (_, connection, _, _) = setup_all(
            "test_item_merge_message_translation_in_reverse_order",
            MockDataInserts::none().units().items(),
        )
        .await;

        sync_records.reverse();
        SyncBufferRowRepository::new(&connection)
            .upsert_many(&sync_records)
            .unwrap();

        integrate_and_translate_sync_buffer(&connection, true, &mut logger)
            .await
            .unwrap();

        let item_link_repo = ItemLinkRowRepository::new(&connection);
        let mut item_links = item_link_repo
            .find_many_by_item_id(&"item_c".to_string())
            .unwrap();

        item_links.sort_by_key(|i| i.id.to_owned());
        assert_eq!(item_links, expected_item_links);
    }
}
