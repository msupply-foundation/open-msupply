use crate::sync::{
    sync_serde::empty_str_as_option_string, translations::form_schema::FormSchemaTranslation,
};
use repository::{
    ReportContext, ReportRow, ReportRowDelete, ReportType, StorageConnection, SyncBufferRow,
};

use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize, Debug, PartialEq)]
pub enum LegacyReportEditor {
    #[serde(rename = "omsupply")]
    OmSupply,
    #[serde(other)]
    Others,
}

#[derive(Deserialize, Serialize, Debug, PartialEq)]
pub enum LegacyReportContext {
    #[serde(rename = "Customer Invoice")]
    CustomerInvoice,
    #[serde(rename = "Supplier Invoice")]
    SupplierInvoice,
    #[serde(rename = "Requisition")]
    Requisition,
    #[serde(rename = "Stock Take")]
    Stocktake,

    #[serde(rename = "Patient Details")]
    Patient,
    #[serde(rename = "Dispensary")]
    Dispensary,

    #[serde(rename = "Repack Finalised")]
    Repack,
    #[serde(other)]
    Others,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyReportRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub report_name: String,
    pub editor: LegacyReportEditor,
    pub context: LegacyReportContext,
    pub template: String,

    #[serde(rename = "Comment")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub sub_context: Option<String>,
    #[serde(rename = "form_schema_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub argument_schema_id: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ReportTranslation)
}

pub(super) struct ReportTranslation;
impl SyncTranslation for ReportTranslation {
    fn table_name(&self) -> &'static str {
        "report"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![FormSchemaTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyReportRow {
            id,
            report_name,
            editor,
            context,
            template,
            comment,
            sub_context,
            argument_schema_id,
        } = serde_json::from_str::<LegacyReportRow>(&sync_record.data)?;

        let r#type = match editor {
            LegacyReportEditor::OmSupply => ReportType::OmSupply,
            LegacyReportEditor::Others => return Ok(PullTranslateResult::NotMatched),
        };
        let context = match context {
            LegacyReportContext::CustomerInvoice => ReportContext::OutboundShipment,
            LegacyReportContext::SupplierInvoice => ReportContext::InboundShipment,
            LegacyReportContext::Requisition => ReportContext::Requisition,
            LegacyReportContext::Stocktake => ReportContext::Stocktake,
            LegacyReportContext::Patient => ReportContext::Patient,
            LegacyReportContext::Dispensary => ReportContext::Dispensary,
            LegacyReportContext::Repack => ReportContext::Repack,
            LegacyReportContext::Others => {
                return Ok(PullTranslateResult::Ignored(
                    "Unknown report context".to_string(),
                ))
            }
        };

        let result = ReportRow {
            id,
            name: report_name,
            r#type,
            template,
            context,
            comment,
            sub_context,
            argument_schema_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(ReportRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_report_translation() {
        use crate::sync::test::test_data::report as test_data;
        let translator = ReportTranslation {};

        let (_, connection, _, _) =
            setup_all("test_report_translation", MockDataInserts::none()).await;

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
