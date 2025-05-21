use crate::sync::{
    sync_serde::{date_to_isostring, empty_str_as_option_string, naive_time},
    translations::{
        invoice_line::InvoiceLineTranslation, stock_line::StockLineTranslation,
        store::StoreTranslation, user::UserTranslation, vvm_status::VVMStatusTranslation,
    },
};
use anyhow::Error;
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    vvm_status::vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyVVMStatusLogRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "status_ID")]
    pub status_id: String,
    #[serde(serialize_with = "date_to_isostring")]
    pub date: NaiveDate,
    #[serde(deserialize_with = "naive_time")]
    pub time: NaiveTime,
    #[serde(rename = "item_line_ID")]
    pub stock_line_id: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
    #[serde(rename = "user_ID")]
    pub created_by: String,
    #[serde(rename = "trans_line_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub invoice_line_id: Option<String>,
    #[serde(rename = "store_ID")]
    pub store_id: String,
}

pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VVMStatusLogTranslation)
}

pub(super) struct VVMStatusLogTranslation;
impl SyncTranslation for VVMStatusLogTranslation {
    fn table_name(&self) -> &str {
        "vaccine_vial_monitor_status_log"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            VVMStatusTranslation.table_name(),
            StockLineTranslation.table_name(),
            InvoiceLineTranslation.table_name(),
            UserTranslation.table_name(),
            StoreTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::VVMStatusLog)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, Error> {
        let LegacyVVMStatusLogRow {
            id,
            status_id,
            date,
            time,
            stock_line_id,
            comment,
            created_by,
            invoice_line_id,
            store_id,
        } = serde_json::from_str::<LegacyVVMStatusLogRow>(&sync_record.data)?;

        let created_datetime = NaiveDateTime::new(date, time);

        let result = VVMStatusLogRow {
            id,
            status_id,
            created_datetime,
            stock_line_id,
            comment,
            created_by,
            invoice_line_id,
            store_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, Error> {
        let VVMStatusLogRow {
            id,
            status_id,
            created_datetime,
            stock_line_id,
            comment,
            created_by,
            invoice_line_id,
            store_id,
        } = VVMStatusLogRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "VVM Status Log row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyVVMStatusLogRow {
            id,
            status_id,
            date: created_datetime.date(),
            time: created_datetime.time(),
            stock_line_id,
            comment,
            created_by,
            invoice_line_id,
            store_id,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_vvm_status_log_translation() {
        use crate::sync::test::test_data::vvm_status_log as test_data;
        let translator = VVMStatusLogTranslation {};

        let (_, connection, _, _) =
            setup_all("test_vvm_status_log_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
