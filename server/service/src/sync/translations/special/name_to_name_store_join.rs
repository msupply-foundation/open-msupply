use repository::{
    EqualFilter, NameStoreJoinFilter, NameStoreJoinRepository, NameStoreJoinRow, StorageConnection,
    SyncBufferRow,
};

use serde::Deserialize;

use crate::sync::translations::{name::NameTranslation, PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct PartialLegacyNameRow {
    pub ID: String,
    #[serde(rename = "customer")]
    pub name_is_customer: bool,
    #[serde(rename = "supplier")]
    pub name_is_supplier: bool,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameToNameStoreJoinTranslation)
}
// In omSupply, is_customer and is_supplier relationship between store and name is stored
// in name_store_join, in mSupply it's stored on name. This translator updates all name_store_joins
// for name when name is pulled (setting is_customer and is_supplier appropriately)
// NOTE Translator should be removed when central server configures these properties on name_store_join
pub(super) struct NameToNameStoreJoinTranslation;
impl SyncTranslation for NameToNameStoreJoinTranslation {
    fn table_name(&self) -> &str {
        NameTranslation.table_name()
    }

    // Even though we are making changes to name_store_joins, no dependencies required
    // this translator is special translator to update existing names_store_joins when
    // name.is_customer or name.is_supplier are toggled
    // Btw, when name_store_joins are upserted, we check name for is_customer,is_supplier
    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<PartialLegacyNameRow>(&sync_record.data)?;

        let name_store_joins = NameStoreJoinRepository::new(connection)
            .query_by_filter(NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(&data.ID)))?;

        let upserts = name_store_joins
            .into_iter()
            .map(|r| NameStoreJoinRow {
                name_is_customer: data.name_is_customer,
                name_is_supplier: data.name_is_supplier,
                ..r.name_store_join
            })
            .collect();

        Ok(PullTranslateResult::upserts(upserts))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_to_name_store_join_translation() {
        use crate::sync::test::test_data::special::name_to_name_store_join as test_data;
        let translator = NameToNameStoreJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_name_to_name_store_join_translation",
            MockDataInserts::none().names(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            record.insert_extra_data(&connection).await;

            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
