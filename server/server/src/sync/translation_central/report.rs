use crate::sync::{
    sync_serde::empty_str_as_option, translation_central::TRANSLATION_RECORD_REPORT,
};
use repository::{CentralSyncBufferRow, ReportContext, ReportRow, ReportType};

use serde::{Deserialize, Serialize};

use super::{CentralPushTranslation, IntegrationUpsertRecord};

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

    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "Comment")]
    pub comment: Option<String>,
}

pub struct ReportTranslation {}
impl CentralPushTranslation for ReportTranslation {
    fn try_translate(
        &self,
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<IntegrationUpsertRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_REPORT;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyReportRow>(&sync_record.data)?;

        let r#type = match data.editor {
            LegacyReportEditor::OmSupply => ReportType::OmSupply,
            LegacyReportEditor::Others => return Ok(None),
        };
        let context = match data.context {
            LegacyReportContext::CustomerInvoice => ReportContext::OutboundShipment,
            LegacyReportContext::SupplierInvoice => ReportContext::InboundShipment,
            LegacyReportContext::Requisition => ReportContext::Requisition,
            LegacyReportContext::Stocktake => ReportContext::Stocktake,
            LegacyReportContext::Others => return Ok(None),
        };
        Ok(Some(IntegrationUpsertRecord::Report(ReportRow {
            id: data.id.to_string(),
            name: data.report_name.to_string(),
            r#type,
            template: data.template,
            context,
            comment: data.comment,
        })))
    }
}

#[cfg(test)]
mod tests {
    use super::{CentralPushTranslation, ReportTranslation};
    use crate::sync::translation_central::{
        test_data::{report::get_test_report_records, TestSyncDataRecord},
        IntegrationUpsertRecord,
    };

    #[test]
    fn test_report_translation() {
        for record in get_test_report_records() {
            match record.translated_record {
                TestSyncDataRecord::Report(translated_record) => {
                    assert_eq!(
                        ReportTranslation {}
                            .try_translate(&record.central_sync_buffer_row)
                            .unwrap(),
                        translated_record.map(|r| (IntegrationUpsertRecord::Report(r))),
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
