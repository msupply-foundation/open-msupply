use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, NameRowRepository, NameStoreJoin,
    NameStoreJoinFilter, NameStoreJoinRepository, NameStoreJoinRow, NameStoreJoinRowDelete,
    StorageConnection, StoreRowRepository, SyncBufferRow,
};

use serde::{Deserialize, Serialize};

use crate::sync::translations::{name::NameTranslation, store::StoreTranslation};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

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
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameStoreJoinTranslation)
}

pub(super) struct NameStoreJoinTranslation;
impl SyncTranslation for NameStoreJoinTranslation {
    fn table_name(&self) -> &'static str {
        "name_store_join"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![NameTranslation.table_name(), StoreTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::NameStoreJoin)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyNameStoreJoinRow>(&sync_record.data)?;

        // in mSupply the inactive flag is used for soft-deletes.
        // given that we don't handle soft deletes, translate to a hard-delete
        if let Some(inactive) = data.inactive {
            if inactive {
                return self.try_translate_from_delete_sync_record(connection, sync_record);
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
                return Ok(PullTranslateResult::Ignored(
                    "Name store join references itself".to_string(),
                ));
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

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
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

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(&legacy_row)?,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // it is possible for name store join to be set inactive
        // this is handled in the upsert translation
        Ok(PullTranslateResult::delete(NameStoreJoinRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::{
        test::merge_helpers::merge_all_name_links, translations::ToSyncRecordTranslationType,
    };
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
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_upsert_inactive_records() {
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
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
            assert!(translator.should_translate_to_sync_record(
                &changelog,
                &ToSyncRecordTranslationType::PushToLegacyCentral
            ));
            let translated = translator
                .try_translate_to_upsert_sync_record(&connection, &changelog)
                .unwrap();

            assert!(matches!(translated, PushTranslateResult::PushRecord(_)));

            let PushTranslateResult::PushRecord(translated) = translated else {
                panic!("Test fail, should translate")
            };

            assert_eq!(translated[0].record.record_data["name_ID"], json!("name_a"));
        }
    }
}
