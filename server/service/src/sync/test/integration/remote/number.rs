use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullUpsertRecord},
};
use rand::{thread_rng, Rng};
use repository::{NumberRow, NumberRowType};
use serde_json::json;
use util::uuid::uuid;

fn gen_i32() -> i32 {
    thread_rng().gen::<i32>()
}

pub struct NumberRecordTester;
impl SyncRecordTester for NumberRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let store_id = &new_site_properties.store_id;

        let mut row_0 = NumberRow {
            id: uuid(),
            value: gen_i32() as i64,
            store_id: store_id.to_string(),
            r#type: NumberRowType::InboundShipment.to_string(),
        };

        let mut row_1 = NumberRow {
            id: uuid(),
            value: gen_i32() as i64,
            store_id: store_id.to_string(),
            r#type: NumberRowType::OutboundShipment.to_string(),
        };

        let mut row_2 = NumberRow {
            id: uuid(),
            value: gen_i32() as i64,
            store_id: store_id.to_string(),
            r#type: NumberRowType::InventoryAdjustment.to_string(),
        };

        let mut row_3 = NumberRow {
            id: uuid(),
            value: gen_i32() as i64,
            store_id: store_id.to_string(),
            r#type: NumberRowType::RequestRequisition.to_string(),
        };

        let mut row_4 = NumberRow {
            id: uuid(),
            value: gen_i32() as i64,
            store_id: store_id.to_string(),
            r#type: NumberRowType::ResponseRequisition.to_string(),
        };

        let mut row_5 = NumberRow {
            id: uuid(),
            value: gen_i32() as i64,
            store_id: store_id.to_string(),
            r#type: NumberRowType::Stocktake.to_string(),
        };

        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Number(row_0.clone()),
                PullUpsertRecord::Number(row_1.clone()),
                PullUpsertRecord::Number(row_2.clone()),
                PullUpsertRecord::Number(row_3.clone()),
                PullUpsertRecord::Number(row_4.clone()),
                PullUpsertRecord::Number(row_5.clone()),
            ]),
        });
        // STEP 2 - mutate
        row_0.value = gen_i32() as i64;
        row_1.value = gen_i32() as i64;
        row_2.value = gen_i32() as i64;
        row_3.value = gen_i32() as i64;
        row_4.value = gen_i32() as i64;
        row_5.value = gen_i32() as i64;

        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Number(row_0),
                PullUpsertRecord::Number(row_1),
                PullUpsertRecord::Number(row_2),
                PullUpsertRecord::Number(row_3),
                PullUpsertRecord::Number(row_4),
                PullUpsertRecord::Number(row_5),
            ]),
        });

        result
    }
}
