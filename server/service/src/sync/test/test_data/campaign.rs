use repository::campaign::campaign_row::CampaignRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "campaign";

const CAMPAIGN1: (&str, &str) = (
    "CAMPAIGN1",
    r#"{
        "id": "CAMPAIGN1",
        "name": "COVID-19 Campaign",
        "code": "COVID-19",
        "deleted_datetime": null
    }"#,
);

fn campaign1() -> CampaignRow {
    CampaignRow {
        id: CAMPAIGN1.0.to_string(),
        name: "COVID-19 Campaign".to_string(),
        code: "COVID-19".to_string(),
        ..Default::default()
    }
}

// As sent by a central server from before campaigns had a code: the dates it still
// carries are ignored, and the code comes in blank
const CAMPAIGN2: (&str, &str) = (
    "CAMPAIGN2",
    r#"{
        "id": "CAMPAIGN2",
        "name": "Polio Vaccination Campaign",
        "start_date": "2023-06-01",
        "end_date": "2023-06-30",
        "deleted_datetime": null
    }"#,
);

fn campaign2() -> CampaignRow {
    CampaignRow {
        id: CAMPAIGN2.0.to_string(),
        name: "Polio Vaccination Campaign".to_string(),
        ..Default::default()
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, CAMPAIGN1, campaign1()),
        TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, CAMPAIGN2, campaign2()),
    ]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: CAMPAIGN1.0.to_string(),
            push_data: json!(campaign1()),
        },
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: CAMPAIGN2.0.to_string(),
            push_data: json!(campaign2()),
        },
    ]
}
