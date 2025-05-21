use repository::campaign::campaign_row::CampaignRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "campaign";

const CAMPAIGN1: (&str, &str) = (
    "5fb99f9c-03f4-47f2-965b-c9ecd083c675",
    r#"{
        "id": "5fb99f9c-03f4-47f2-965b-c9ecd083c675",
        "name": "COVID-19 Campaign",
        "start_date": "2023-01-01",
        "end_date": "2023-12-31",
        "deleted_datetime": null
    }"#,
);

fn campaign1() -> CampaignRow {
    CampaignRow {
        id: CAMPAIGN1.0.to_string(),
        name: "COVID-19 Campaign".to_string(),
        start_date: Some(chrono::NaiveDate::from_ymd_opt(2023, 1, 1).unwrap()),
        end_date: Some(chrono::NaiveDate::from_ymd_opt(2023, 12, 31).unwrap()),
        deleted_datetime: None,
    }
}

const CAMPAIGN2: (&str, &str) = (
    "a9a986cd-a6dc-4e96-811c-4bc225a4f2d8",
    r#"{
        "id": "a9a986cd-a6dc-4e96-811c-4bc225a4f2d8",
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
        start_date: Some(chrono::NaiveDate::from_ymd_opt(2023, 6, 1).unwrap()),
        end_date: Some(chrono::NaiveDate::from_ymd_opt(2023, 6, 30).unwrap()),
        deleted_datetime: None,
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
