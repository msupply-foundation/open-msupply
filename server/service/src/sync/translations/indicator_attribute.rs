use anyhow::anyhow;
use repository::{
    IndicatorColumnRow, IndicatorLineRow, StorageConnection, SyncBufferRow, ValueType,
};

use serde::Deserialize;

use crate::sync::translations::program_indicator::ProgramIndicatorTranslation;

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, PartialEq)]
enum LegacyAxis {
    #[serde(rename = "column")]
    Column,
    #[serde(rename = "row")]
    Row,
}

#[derive(Deserialize, PartialEq)]
enum LegacyValueType {
    #[serde(rename = "number")]
    Number,
    #[serde(rename = "string")]
    String,
    #[serde(rename = "var")]
    Var,
}
impl Into<ValueType> for LegacyValueType {
    fn into(self) -> ValueType {
        match self {
            LegacyValueType::Number => ValueType::Number,
            LegacyValueType::String => ValueType::String,
            LegacyValueType::Var => ValueType::Var,
        }
    }
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyIndicatorAttribute {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "indicator_ID")]
    program_indicator_id: String,
    description: String,
    code: String,
    index: i64,
    is_required: bool,
    value_type: LegacyValueType,
    axis: LegacyAxis,
    is_active: bool,
    default_value: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(IndicatorAttribute)
}
pub(super) struct IndicatorAttribute;
impl SyncTranslation for IndicatorAttribute {
    fn table_name(&self) -> &str {
        "indicator_attribute"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![ProgramIndicatorTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyIndicatorAttribute {
            id,
            program_indicator_id,
            description,
            code,
            index,
            is_required,
            value_type,
            axis,
            is_active,
            default_value,
        } = serde_json::from_str::<LegacyIndicatorAttribute>(&sync_record.data)?;
        Ok(match axis {
            LegacyAxis::Column => PullTranslateResult::upsert(IndicatorColumnRow {
                id,
                program_indicator_id,
                index,
                header: description,
                value_type: value_type.into(),
                default_value,
                is_active,
            }),
            LegacyAxis::Row => PullTranslateResult::upsert(IndicatorLineRow {
                id,
                program_indicator_id,
                index,
                description,
                code,
                value_type: value_type.into(),
                default_value,
                is_required,
                is_active,
            }),
        })
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Err(anyhow!(
            "Delete not supported for program_indicator records"
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_program_indicator_translation() {
        use crate::sync::test::test_data::program_indicator;
        let translator = IndicatorAttribute;

        let (_, connection, _, _) = setup_all(
            "test_program_indicator_translation",
            MockDataInserts::none(),
        )
        .await;

        program_indicator::test_pull_upsert_records()
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
