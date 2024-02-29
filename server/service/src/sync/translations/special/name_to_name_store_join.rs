use repository::{
    EqualFilter, NameStoreJoinFilter, NameStoreJoinRepository, StorageConnection, SyncBufferRow,
};

use serde::Deserialize;

use crate::sync::translations::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct PartialLegacyNameRow {
    pub ID: String,
    #[serde(rename = "customer")]
    pub name_is_customer: bool,
    #[serde(rename = "supplier")]
    pub name_is_supplier: bool,
}

// In omSupply, is_customer and is_supplier relationship between store and name is stored
// in name_store_join, in mSupply it's stored on name. This translator updates all name_store_joins
// for name when name is pulled (setting is_customer and is_supplier appropriately)
// NOTE Translator should be removed when central server configures these properties on name_store_join
pub(crate) struct NameToNameStoreJoinTranslation {}
impl SyncTranslation for NameToNameStoreJoinTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::NAME,
            dependencies: vec![],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if sync_record.table_name != LegacyTableName::NAME {
            return Ok(None);
        }

        let data = serde_json::from_str::<PartialLegacyNameRow>(&sync_record.data)?;

        let name_store_joins = NameStoreJoinRepository::new(connection)
            .query_by_filter(NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(&data.ID)))?;

        if name_store_joins.len() == 0 {
            return Ok(None);
        }

        let upserts: Vec<PullUpsertRecord> = name_store_joins
            .into_iter()
            .map(|mut r| {
                r.name_store_join.name_is_customer = data.name_is_customer;
                r.name_store_join.name_is_supplier = data.name_is_supplier;
                PullUpsertRecord::NameStoreJoin(r.name_store_join)
            })
            .collect();

        Ok(Some(IntegrationRecords::from_upserts(upserts)))
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

            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
