use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use chrono::NaiveDate;
use repository::{
    requisition_row::{RequisitionStatus, RequisitionType},
    RequisitionLineRow, RequisitionLineRowDelete, RequisitionRow, RequisitionRowDelete,
};
use serde_json::json;
use util::{inline_edit, uuid::uuid};

pub(crate) struct RequisitionRecordTester;
impl SyncRecordTester for RequisitionRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        let store_id = &new_site_properties.store_id;

        // STEP 1 - insert
        let base_requisition_row = RequisitionRow {
            id: uuid(),
            store_id: store_id.to_string(),
            user_id: None,
            requisition_number: 456,
            name_link_id: uuid(),
            r#type: RequisitionType::Request,
            status: RequisitionStatus::Draft,
            created_datetime: NaiveDate::from_ymd_opt(2022, 03, 23)
                .unwrap()
                .and_hms_opt(8, 53, 0)
                .unwrap(),
            sent_datetime: None,
            finalised_datetime: None,
            expected_delivery_date: None,
            colour: None,
            comment: None,
            their_reference: None,
            max_months_of_stock: 10.0,
            min_months_of_stock: 5.0,
            linked_requisition_id: None,
            approval_status: None,
            program_id: None,
            period_id: None,
            order_type: None,
        };
        let requisition_row_1 = base_requisition_row.clone();
        let requisition_line_row_1 = RequisitionLineRow {
            id: uuid(),
            requisition_id: requisition_row_1.id.clone(),
            item_link_id: uuid(),
            item_name: "test item".to_string(),
            requested_quantity: 50,
            suggested_quantity: 10,
            supply_quantity: 5,
            available_stock_on_hand: 10,
            average_monthly_consumption: 15,
            comment: None,
            snapshot_datetime: None,
            approved_quantity: 0,
            approval_comment: None,
        };

        let requisition_row_2 = inline_edit(&base_requisition_row, |mut d| {
            d.id = uuid();
            d.r#type = RequisitionType::Response;
            d.status = RequisitionStatus::New;
            d
        });
        let requisition_row_3 = inline_edit(&base_requisition_row, |mut d| {
            d.id = uuid();
            d.status = RequisitionStatus::Sent;
            d
        });
        let requisition_row_4 = inline_edit(&base_requisition_row, |mut d| {
            d.id = uuid();
            d.status = RequisitionStatus::Finalised;
            d
        });

        result.push(TestStepData {
            central_upsert: json!({
                "item": [{
                    "ID": requisition_line_row_1.item_link_id,
                    "type_of": "general"
                }],
                "name": [{
                    "ID": base_requisition_row.name_link_id,
                    "type": "store"
                }],
            }),
            integration_records: vec![
                IntegrationOperation::upsert(requisition_row_1.clone()),
                IntegrationOperation::upsert(requisition_row_2.clone()),
                IntegrationOperation::upsert(requisition_row_3),
                IntegrationOperation::upsert(requisition_row_4),
                IntegrationOperation::upsert(requisition_line_row_1.clone()),
            ],
            ..Default::default()
        });

        // STEP 2 - mutate
        let requisition_row_1 = inline_edit(&requisition_row_1, |mut d| {
            d.user_id = Some("test user 2".to_string());
            d.r#type = RequisitionType::Response;
            d.status = RequisitionStatus::Finalised;
            d.comment = Some("requisition comment".to_string());
            d.their_reference = Some("requisition their ref".to_string());
            d.colour = Some("#1A1919".to_string());
            d.sent_datetime = NaiveDate::from_ymd_opt(2022, 03, 24)
                .unwrap()
                .and_hms_opt(8, 53, 0);
            d.finalised_datetime = NaiveDate::from_ymd_opt(2022, 03, 25)
                .unwrap()
                .and_hms_opt(8, 53, 0);
            d.expected_delivery_date = NaiveDate::from_ymd_opt(2022, 03, 28);
            d.max_months_of_stock = 15.0;
            d.min_months_of_stock = 10.0;
            d.linked_requisition_id = Some(requisition_row_2.id.clone());
            d
        });

        let requisition_row_2 = inline_edit(&requisition_row_2, |mut d| {
            d.linked_requisition_id = Some(requisition_row_1.id.clone());
            d
        });

        let requisition_line_row_1 = inline_edit(&requisition_line_row_1, |mut d| {
            d.requested_quantity = 55;
            d.suggested_quantity = 15;
            d.supply_quantity = 15;
            d.available_stock_on_hand = 15;
            d.average_monthly_consumption = 10;
            d.comment = Some("some comment".to_string());
            d.snapshot_datetime = NaiveDate::from_ymd_opt(2022, 03, 20)
                .unwrap()
                .and_hms_opt(12, 13, 14);
            d
        });

        result.push(TestStepData {
            integration_records: vec![
                IntegrationOperation::upsert(requisition_row_1.clone()),
                IntegrationOperation::upsert(requisition_row_2.clone()),
                IntegrationOperation::upsert(requisition_line_row_1.clone()),
            ],
            ..Default::default()
        });
        // STEP 3 - delete
        let requisition_row_2 = inline_edit(&requisition_row_2, |mut d| {
            d.linked_requisition_id = None;
            d
        });
        result.push(TestStepData {
            integration_records: vec![
                IntegrationOperation::upsert(requisition_row_2),
                IntegrationOperation::delete(RequisitionLineRowDelete(
                    requisition_line_row_1.id.clone(),
                )),
                IntegrationOperation::delete(RequisitionRowDelete(requisition_row_1.id.clone())),
            ],
            ..Default::default()
        });
        result
    }
}
