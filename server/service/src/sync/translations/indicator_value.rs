use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    ChangelogRow, ChangelogTableName, EqualFilter, IndicatorValueRow, IndicatorValueRowDelete,
    StorageConnection, StoreFilter, StoreRepository, SyncBufferRow,
};

use serde::{Deserialize, Serialize};

use crate::sync::translations::indicator_attribute::IndicatorAttribute;

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyIndicatorValue {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "facility_ID")]
    customer_store_id: String,
    #[serde(rename = "period_ID")]
    period_id: String,
    #[serde(rename = "column_ID")]
    indicator_column_id: String,
    #[serde(rename = "row_ID")]
    indicator_line_id: String,
    #[serde(rename = "store_ID")]
    store_id: String,
    value: String,
}

// Needs to be added to all_translators()
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(IndicatorValue)
}
pub(super) struct IndicatorValue;
impl SyncTranslation for IndicatorValue {
    fn table_name(&self) -> &str {
        "indicator_value"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![IndicatorAttribute.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::IndicatorValue)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyIndicatorValue {
            id,
            customer_store_id,
            period_id,
            indicator_column_id,
            indicator_line_id,
            store_id,
            value,
        } = serde_json::from_str::<LegacyIndicatorValue>(&sync_record.data)?;
        let customer_name_link_id = StoreRepository::new(connection)
            .query_one(StoreFilter::new().id(EqualFilter::equal_to(&customer_store_id)))?
            .ok_or(anyhow::anyhow!(
                "The store record for facility_ID/customer_store_id could not be found! {customer_store_id}"
            ))?
            .store_row
            .name_link_id;

        Ok(PullTranslateResult::upsert(IndicatorValueRow {
            id,
            customer_name_link_id,
            store_id,
            period_id,
            indicator_line_id,
            indicator_column_id,
            value,
        }))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Some(indicator_value) = IndicatorValueRepository::new(connection)
            .query_by_filter(
                IndicatorValueFilter::new().id(EqualFilter::equal_to(&changelog.record_id)),
            )?
            .pop()
        else {
            return Err(anyhow::anyhow!("indicator_value row not found"));
        };

        let IndicatorValueRow {
            id,
            customer_name_link_id,
            store_id,
            period_id,
            indicator_line_id,
            indicator_column_id,
            value,
        } = indicator_value;

        let customer_store_id = StoreRepository::new(connection)
            .query_one(StoreFilter::new().name_id(EqualFilter::equal_to(&customer_name_link_id)))?
            .ok_or(anyhow::anyhow!(
                "The store record for customer_name_link_id could not be found! {customer_name_link_id}"
            ))?
            .store_row
            .id;

        let legacy_row = LegacyIndicatorValue {
            id,
            customer_store_id,
            period_id,
            indicator_column_id,
            indicator_line_id,
            store_id,
            value,
        };
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // TODO, check site ? (should never get delete records for this site, only transfer other half)
        Ok(PullTranslateResult::delete(IndicatorValueRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_indicator_value_translation() {
        use crate::sync::test::test_data::indicator_value;
        let translator = IndicatorValue;

        let (_, connection, _, _) = setup_all(
            "test_indicator_value_translation",
            MockDataInserts::none().stores(),
        )
        .await;

        indicator_value::test_pull_upsert_records()
            .into_iter()
            .for_each(|record| {
                assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
                let translation_result = translator
                    .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                    .unwrap();

                assert_eq!(translation_result, record.translated_record);
            });

        indicator_value::test_pull_delete_records()
            .into_iter()
            .for_each(|record| {
                assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
                let translation_result = translator
                    .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                    .unwrap();

                assert_eq!(translation_result, record.translated_record);
            });
    }
}
