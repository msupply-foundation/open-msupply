use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullUpsertRecord},
};
use repository::{InventoryAdjustmentReasonRow, InventoryAdjustmentReasonType};

use serde_json::json;
use util::uuid::uuid;

pub(crate) struct InventoryAdjustmentReasonTester;

impl SyncRecordTester for InventoryAdjustmentReasonTester {
    fn test_step_data(&self, _: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let pos_1 = InventoryAdjustmentReasonRow {
            id: uuid(),
            r#type: InventoryAdjustmentReasonType::Positive,
            is_active: true,
            reason: "POS 1".to_string(),
        };

        let pos_2 = InventoryAdjustmentReasonRow {
            id: uuid(),
            r#type: InventoryAdjustmentReasonType::Positive,
            is_active: false,
            reason: "POS 2".to_string(),
        };

        let neg_1 = InventoryAdjustmentReasonRow {
            id: uuid(),
            r#type: InventoryAdjustmentReasonType::Negative,
            is_active: false,
            reason: "NEG 1".to_string(),
        };

        let neg_2 = InventoryAdjustmentReasonRow {
            id: uuid(),
            r#type: InventoryAdjustmentReasonType::Negative,
            is_active: true,
            reason: "NEG 2".to_string(),
        };

        result.push(TestStepData {
            central_upsert: json!({
                "options": [{
                    "ID": pos_1.id,
                    "isActive": true,
                    "title": "POS 1",
                    "type": "positiveInventoryAdjustment"
                  }, {
                    "ID": pos_2.id,
                    "isActive": false,
                    "title": "POS 2",
                    "type": "positiveInventoryAdjustment"
                  }, {
                    "ID": neg_1.id,
                    "isActive": false,
                    "title": "NEG 1",
                    "type": "negativeInventoryAdjustment"
                  }, {
                    "ID": neg_2.id,
                    "isActive": true,
                    "title": "NEG 2",
                    "type": "negativeInventoryAdjustment"
                  }],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::InventoryAdjustmentReason(pos_1),
                PullUpsertRecord::InventoryAdjustmentReason(pos_2),
                PullUpsertRecord::InventoryAdjustmentReason(neg_1),
                PullUpsertRecord::InventoryAdjustmentReason(neg_2),
            ]),
        });
        // STEP 2 - deletes
        // TODO should be soft deleted
        result
    }
}
