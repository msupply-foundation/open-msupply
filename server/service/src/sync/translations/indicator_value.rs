use repository::{IndicatorValueRow, IndicatorValueRowDelete, StorageConnection, SyncBufferRow};

use serde::{Deserialize, Serialize};

use crate::sync::translations::program_indicator::ProgramIndicatorTranslation;

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyIndicatorValue {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "facility_ID")]
    customer_name_link_id: String,
    #[serde(rename = "period_ID")]
    period_id: String,
    #[serde(rename = "column_ID")]
    indicator_column_id: String,
    #[serde(rename = "row_ID")]
    indicator_line_id: String,
    #[serde(rename = "store_ID")]
    supplier_store_id: String,
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
        vec![ProgramIndicatorTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyIndicatorValue {
            id,
            customer_name_link_id,
            period_id,
            indicator_column_id,
            indicator_line_id,
            supplier_store_id,
            value,
        } = serde_json::from_str::<LegacyIndicatorValue>(&sync_record.data)?;
        Ok(PullTranslateResult::upsert(IndicatorValueRow {
            id,
            customer_name_link_id,
            supplier_store_id,
            period_id,
            indicator_line_id,
            indicator_column_id,
            value,
        }))
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_indicator_value_translation() {
        use crate::sync::test::test_data::indicator_value;
        let translator = IndicatorValue;

        let (_, connection, _, _) =
            setup_all("test_indicator_value_translation", MockDataInserts::none()).await;

        indicator_value::test_pull_upsert_records()
            .into_iter()
            .for_each(|record| {
                assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
                let translation_result = translator
                    .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                    .unwrap();

                assert_eq!(translation_result, record.translated_record);
            });
    }
}
