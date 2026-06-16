use crate::sync::translations::{
    location::LocationTranslation, stock_line::StockLineTranslation, store::StoreTranslation,
    PullTranslateResult, PushTranslateResult, SyncTranslation,
};
use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, StockRelocationRow, StockRelocationRowDelete,
    StockRelocationRowRepository, StockRelocationStatus, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_from_date_time, date_option_to_isostring, date_to_isostring, empty_str_as_option,
    empty_str_as_option_string, object_fields_as_option, zero_date_as_option,
};

#[derive(Deserialize, Serialize, Debug, Clone, Default, schemars::JsonSchema)]
pub struct LegacyReplenishmentRowOmsFields {
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub created_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub finalised_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub to_pack_size: Option<f64>,
}

#[derive(Deserialize, Serialize, Debug, PartialEq, Clone, schemars::JsonSchema)]
pub enum LegacyReplenishmentStatus {
    #[serde(rename = "sg")]
    Sg,
    #[serde(rename = "fn")]
    #[serde(alias = "FN")]
    Fn,
    /// Bucket to catch all other variants
    #[serde(other)]
    Others,
}

fn stock_relocation_status(status: &LegacyReplenishmentStatus) -> StockRelocationStatus {
    match status {
        LegacyReplenishmentStatus::Sg => StockRelocationStatus::New,
        LegacyReplenishmentStatus::Fn => StockRelocationStatus::Finalised,
        LegacyReplenishmentStatus::Others => StockRelocationStatus::New,
    }
}

fn legacy_stock_relocation_status(status: &StockRelocationStatus) -> LegacyReplenishmentStatus {
    match status {
        StockRelocationStatus::New => LegacyReplenishmentStatus::Sg,
        StockRelocationStatus::Finalised => LegacyReplenishmentStatus::Fn,
    }
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug, schemars::JsonSchema)]
pub struct LegacyReplenishmentRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(rename = "user_ID_created_by")]
    pub user_id: String,

    #[serde(rename = "from_item_line_ID")]
    pub from_stock_line_id: String,
    #[serde(default)]
    pub from_number_of_packs: f64,
    #[serde(rename = "from_location_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub from_location_id: Option<String>,

    #[serde(rename = "to_item_line_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub to_stock_line_id: Option<String>,
    #[serde(rename = "to_location_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub to_location_id: Option<String>,

    #[serde(serialize_with = "date_to_isostring")]
    pub date_created: NaiveDate,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    #[serde(default)]
    pub date_finalised: Option<NaiveDate>,

    pub status: LegacyReplenishmentStatus,

    #[serde(default)]
    #[serde(deserialize_with = "object_fields_as_option")]
    pub oms_fields: Option<LegacyReplenishmentRowOmsFields>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StockRelocationTranslation)
}

pub(super) struct StockRelocationTranslation;

impl SyncTranslation for StockRelocationTranslation {
    fn table_name(&self) -> &str {
        "replenishment"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            StockLineTranslation.table_name(),
            LocationTranslation.table_name(),
            StoreTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::StockRelocation)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyReplenishmentRow {
            id,
            store_id,
            user_id,
            from_stock_line_id,
            from_number_of_packs,
            from_location_id,
            to_stock_line_id,
            to_location_id,
            date_created,
            date_finalised,
            status,
            oms_fields,
        } = serde_json::from_str::<LegacyReplenishmentRow>(&sync_record.data)?;

        let oms_fields = oms_fields.unwrap_or_default();
        let created_datetime = oms_fields
            .created_datetime
            .unwrap_or_else(|| date_created.and_hms_opt(0, 0, 0).unwrap_or_default());
        let finalised_datetime = oms_fields
            .finalised_datetime
            .or_else(|| date_finalised.and_then(|date| date.and_hms_opt(0, 0, 0)));

        let result = StockRelocationRow {
            id,
            created_datetime,
            finalised_datetime,
            from_stock_line_id,
            from_location_id,
            from_number_of_packs,
            to_stock_line_id,
            to_location_id,
            to_pack_size: oms_fields.to_pack_size,
            status: stock_relocation_status(&status),
            store_id,
            user_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(StockRelocationRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let StockRelocationRow {
            id,
            created_datetime,
            finalised_datetime,
            from_stock_line_id,
            from_location_id,
            from_number_of_packs,
            to_stock_line_id,
            to_location_id,
            to_pack_size,
            status,
            store_id,
            user_id,
        } = StockRelocationRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| anyhow::anyhow!("Stock relocation row not found"))?;

        let legacy_row = LegacyReplenishmentRow {
            id,
            store_id,
            user_id,
            from_stock_line_id,
            from_number_of_packs,
            from_location_id,
            to_stock_line_id,
            to_location_id,
            date_created: date_from_date_time(&created_datetime),
            date_finalised: finalised_datetime.map(|datetime| date_from_date_time(&datetime)),
            status: legacy_stock_relocation_status(&status),
            oms_fields: Some(LegacyReplenishmentRowOmsFields {
                created_datetime: Some(created_datetime),
                finalised_datetime,
                to_pack_size,
            }),
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
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_stock_relocation_translation() {
        use crate::sync::test::test_data::stock_relocation as test_data;
        let translator = StockRelocationTranslation {};

        let (_, connection, _, _) =
            setup_all("test_stock_relocation_translation", MockDataInserts::none()).await;

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
