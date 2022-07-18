use crate::sync::{
    test::TestSyncPullRecord,
    translations::{LegacyTableName, PullUpsertRecord, PullDeleteRecordTable},
};
use repository::{ReportContext, ReportRow, ReportType};

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

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::REPORT,
        REPORT_1,
        PullUpsertRecord::Report(ReportRow {
            id: REPORT_1.0.to_string(),
            name: "Test".to_string(),
            r#type: ReportType::OmSupply,
            template: "template data".to_string(),
            context: ReportContext::Stocktake,
            comment: Some("Test comment".to_string()),
        }),
    )]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_delete(
        LegacyTableName::REPORT,
        REPORT_1.0,
        PullDeleteRecordTable::Report,
    )]
}
