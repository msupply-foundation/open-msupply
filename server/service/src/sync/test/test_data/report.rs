use crate::sync::test::TestSyncIncomingRecord;
use repository::{ReportContext, ReportRow, ReportRowDelete, ReportType};

const TABLE_NAME: &str = "report";

const REPORT_1: (&str, &str) = (
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
        "template": "template data",
        "sub_context": "",
        "form_schema_ID": ""
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        REPORT_1,
        ReportRow {
            id: REPORT_1.0.to_string(),
            name: "Test".to_string(),
            r#type: ReportType::OmSupply,
            template: "template data".to_string(),
            context: ReportContext::Stocktake,
            comment: Some("Test comment".to_string()),
            sub_context: None,
            argument_schema_id: None,
        },
    )]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        REPORT_1.0,
        ReportRowDelete(REPORT_1.0.to_string()),
    )]
}
