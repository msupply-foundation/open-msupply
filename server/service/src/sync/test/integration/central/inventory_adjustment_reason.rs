use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use repository::{InventoryAdjustmentReasonRow, InventoryAdjustmentReasonRow};

use serde_json::json;
use util::uuid::uuid;

pub(crate) struct InventoryAdjustmentReasonTester;

impl SyncRecordTester for InventoryAdjustmentReasonTester {
    fn test_step_data(&self, _: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let pos_1 = InventoryAdjustmentReasonRow {
            id: uuid(),
            r#type: InventoryAdjustmentReasonRow::Positive,
            is_active: true,
            reason: "POS 1".to_string(),
        };

        let pos_2 = InventoryAdjustmentReasonRow {
            id: uuid(),
            r#type: InventoryAdjustmentReasonRow::Positive,
            is_active: false,
            reason: "POS 2".to_string(),
        };

        let neg_1 = InventoryAdjustmentReasonRow {
            id: uuid(),
            r#type: InventoryAdjustmentReasonRow::Negative,
            is_active: false,
            reason: "NEG 1".to_string(),
        };

        let neg_2 = InventoryAdjustmentReasonRow {
            id: uuid(),
            r#type: InventoryAdjustmentReasonRow::Negative,
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
            integration_records: vec![
                IntegrationOperation::upsert(pos_1),
                IntegrationOperation::upsert(pos_2),
                IntegrationOperation::upsert(neg_1),
                IntegrationOperation::upsert(neg_2),
            ],
            ..Default::default()
        });
        // STEP 2 - deletes
        // TODO should be soft deleted
        result
    }
}
