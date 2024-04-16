use chrono::NaiveDate;
use repository::{
    CurrencyRow, CurrencyRowDelete, CurrencyRowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::sync_serde::{date_option_to_isostring, zero_date_as_option};

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyCurrencyRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub rate: f64,
    #[serde(rename = "currency")]
    pub code: String,
    pub is_home_currency: bool,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date_updated: Option<NaiveDate>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(CurrencyTranslation)
}

pub(crate) struct CurrencyTranslation;
impl SyncTranslation for CurrencyTranslation {
    fn table_name(&self) -> &str {
        "currency"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        Vec::new()
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyCurrencyRow {
            id,
            rate,
            code,
            is_home_currency,
            date_updated,
        } = serde_json::from_str(&sync_record.data)?;

        let currency = CurrencyRowRepository::new(connection).find_one_by_id(&id)?;

        let result = CurrencyRow {
            id,
            rate,
            code,
            is_home_currency,
            date_updated,
            is_active: currency.map_or(true, |c| c.is_active),
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(CurrencyRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_currency_translation() {
        use crate::sync::test::test_data::currency as test_data;
        let translator = CurrencyTranslation {};

        let (_, connection, _, _) =
            setup_all("test_currency_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
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
}
