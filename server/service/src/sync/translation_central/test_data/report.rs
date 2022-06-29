use crate::sync::translation_central::{
    test_data::{TestSyncDataRecord, TestSyncRecord},
    TRANSLATION_RECORD_REPORT,
};
use repository::{ReportContext, ReportRow, ReportType, SyncBufferRow};
use util::inline_init;

const REPORT_1: (&'static str, &'static str) = (
    "76B6C424E1935C4DAF36A7A8F451FE72",
    r#"{
        "ID": "76B6C424E1935C4DAF36A7A8F451FE72",
        "report_name": "Test",
        "report_blob": "blob",
        "permission_ID": "",
        "last_updated": "0000-00-00",
        "type": "cus",
        "user_created_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
        "Custom_name": "Test",
        "Comment": "Test comment",
        "default": false,
        "context": "Stock Take",
        "editor": "omsupply",
        "orientation": "",
        "disabled": false,
        "template": "template data"
    }"#,
);

#[allow(dead_code)]
pub fn get_test_report_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: TestSyncDataRecord::Report(Some(ReportRow {
            id: "76B6C424E1935C4DAF36A7A8F451FE72".to_string(),
            name: "Test".to_string(),
            r#type: ReportType::OmSupply,
            template: "template data".to_string(),
            context: ReportContext::Stocktake,
            comment: Some("Test comment".to_string()),
        })),
        identifier: "REPORT_1",
        central_sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = TRANSLATION_RECORD_REPORT.to_owned();
            r.record_id = REPORT_1.0.to_owned();
            r.data = REPORT_1.1.to_owned();
        }),
    }]
}
