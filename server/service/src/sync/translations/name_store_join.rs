use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, NameRowRepository, NameStoreJoin,
    NameStoreJoinFilter, NameStoreJoinRepository, NameStoreJoinRow, StorageConnection,
    StoreRowRepository, SyncBufferRow,
};

use serde::{Deserialize, Serialize};

use crate::sync::api::RemoteSyncRecordV5;

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullDependency, PullUpsertRecord,
    SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyNameStoreJoinRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(rename = "name_ID")]
    pub name_id: String,
    pub inactive: Option<bool>,
    #[serde(rename = "om_name_is_customer")]
    pub name_is_customer: Option<bool>,
    #[serde(rename = "om_name_is_supplier")]
    pub name_is_supplier: Option<bool>,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::NAME_STORE_JOIN
}

fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::NameStoreJoin
}

pub(crate) struct NameStoreJoinTranslation {}
impl SyncTranslation for NameStoreJoinTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::NAME_STORE_JOIN,
            dependencies: vec![LegacyTableName::NAME, LegacyTableName::STORE],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyNameStoreJoinRow>(&sync_record.data)?;

        // in mSupply the inactive flag is used for soft-deletes.
        // given that we don't handle soft deletes, translate to a hard-delete
        if let Some(inactive) = data.inactive {
            if inactive {
                return self.try_translate_pull_delete(connection, sync_record);
            }
        }

        let name = match NameRowRepository::new(connection).find_one_by_id(&data.name_id)? {
            Some(name) => name,
            None => {
                return Err(anyhow::anyhow!(
                    "Failed to get name '{}' for name_store_join '{}'",
                    data.name_id,
                    data.id
                ))
            }
        };

        if let Some(store) = StoreRowRepository::new(connection)
            .find_one_by_id(&data.store_id)
            .unwrap_or(None)
        {
            // if the name_store_join is referencing itself, then exclude it
            // this is an invalid configuration which shouldn't be possible.. but is
            if store.name_id == data.name_id {
                return Ok(None);
            }
        }

        let result = NameStoreJoinRow {
            id: data.id,
            name_link_id: data.name_id,
            store_id: data.store_id,
            // name_is_customer: data.name_is_customer.unwrap_or(name.is_customer),
            // name_is_supplier: data.name_is_supplier.unwrap_or(name.is_supplier),
            // TODO in mirror setup primary server sends name_store_join to central with previous sync
            // api, and name_is_customer or name_is_supplier on name_store_join are set to `false` rather then
            // remaining as null, for now always names properties for name_is_supplier/customer
            name_is_customer: name.is_customer,
            name_is_supplier: name.is_supplier,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::NameStoreJoin(result),
        )))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

        let NameStoreJoin {
            name_store_join:
                NameStoreJoinRow {
                    id,
                    name_link_id: _,
                    store_id,
                    name_is_customer,
                    name_is_supplier,
                },
            name,
        } = NameStoreJoinRepository::new(connection)
            .query_by_filter(
                NameStoreJoinFilter::new().id(EqualFilter::equal_to(&changelog.record_id)),
            )?
            .pop()
            .ok_or(anyhow::anyhow!("Name store join not found"))?;

        let legacy_row = LegacyNameStoreJoinRow {
            id,
            name_id: name.id,
            store_id,
            name_is_customer: Some(name_is_customer),
            name_is_supplier: Some(name_is_supplier),
            inactive: Some(false),
        };

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LegacyTableName::NAME_STORE_JOIN,
            serde_json::to_value(&legacy_row)?,
        )]))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        // it is possible for name store join to be set inactive
        // this is handled in the upsert translation
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(
                &sync_record.record_id,
                PullDeleteRecordTable::NameStoreJoin,
            )
        });

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::test::merge_helpers::merge_all_name_links;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogFilter, ChangelogRepository,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_name_store_join_translation() {
        use crate::sync::test::test_data::name_store_join as test_data;
        let translator = NameStoreJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_name_store_join_translation",
            MockDataInserts::none().names(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_upsert_inactive_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_name_store_join_push_merged() {
        let (mock_data, connection, _, _) =
            setup_all("test_name_store_join_push_merged", MockDataInserts::all()).await;

        merge_all_name_links(&connection, &mock_data).unwrap();

        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(
                    ChangelogFilter::new().table_name(ChangelogTableName::NameStoreJoin.equal_to()),
                ),
            )
            .unwrap();

        let translator = NameStoreJoinTranslation {};
        for changelog in changelogs {
            let translated = translator
                .try_translate_push_upsert(&connection, &changelog)
                .unwrap()
                .unwrap();

            assert_eq!(translated[0].record.data["name_ID"], json!("name_a"));
        }
    }
}
