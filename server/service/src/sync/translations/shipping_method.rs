use chrono::Utc;
use repository::{shipping_method_row::ShippingMethodRow, StorageConnection, SyncBufferRow};

use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyShippingMethod {
    #[serde(rename = "ID")]
    id: String,
    method: String,
    #[serde(rename = "isActive")]
    is_active: bool,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ShippingMethodTranslation)
}

pub(crate) struct ShippingMethodTranslation;

impl SyncTranslation for ShippingMethodTranslation {
    fn table_name(&self) -> &str {
        "ship_method"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyShippingMethod {
            id,
            method,
            is_active,
        } = serde_json::from_str(&sync_record.data)?;

        let deleted_datetime = if is_active {
            None
        } else {
            Some(Utc::now().naive_utc())
        };

        let result = ShippingMethodRow {
            id,
            method,
            deleted_datetime,
        };

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_shipping_method_translation() {
        use crate::sync::test::test_data::shipping_method as test_data;
        let translator = ShippingMethodTranslation;

        let (_, connection, _, _) =
            setup_all("test_shipping_method_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
