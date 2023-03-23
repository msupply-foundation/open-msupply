use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullDeleteRecord, PullDeleteRecordTable, PullUpsertRecord},
};
use chrono::NaiveDate;
use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    RequisitionLineRow, RequisitionRow,
};
use serde_json::json;
use util::{inline_edit, uuid::uuid};

pub(crate) struct RequisitionRecordTester;
impl SyncRecordTester for RequisitionRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let store_id = &new_site_properties.store_id;
        let base_requisition_row = RequisitionRow {
            id: uuid(),
            store_id: store_id.to_string(),
            user_id: None,
            requisition_number: 456,
            name_id: uuid(),
            r#type: RequisitionRowType::Request,
            status: RequisitionRowStatus::Draft,
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
        };
        let requisition_row_1 = base_requisition_row.clone();
        let requisition_line_row_1 = RequisitionLineRow {
            id: uuid(),
            requisition_id: requisition_row_1.id.clone(),
            item_id: uuid(),
            requested_quantity: 50,
            suggested_quantity: 10,
            supply_quantity: 5,
            available_stock_on_hand: 10,
            average_monthly_consumption: 15,
            comment: None,
            snapshot_datetime: None,
        };

        let requisition_row_2 = inline_edit(&base_requisition_row, |mut d| {
            d.id = uuid();
            d.r#type = RequisitionRowType::Response;
            d.status = RequisitionRowStatus::New;
            d
        });
        let requisition_row_3 = inline_edit(&base_requisition_row, |mut d| {
            d.id = uuid();
            d.status = RequisitionRowStatus::Sent;
            d
        });
        let requisition_row_4 = inline_edit(&base_requisition_row, |mut d| {
            d.id = uuid();
            d.status = RequisitionRowStatus::Finalised;
            d
        });

        result.push(TestStepData {
            central_upsert: json!({
                "item": [{
                    "ID": requisition_line_row_1.item_id,
                    "type_of": "general"
                }],
                "name": [{
                    "ID": base_requisition_row.name_id,
                    "type": "store"
                }],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Requisition(requisition_row_1.clone()),
                PullUpsertRecord::Requisition(requisition_row_2.clone()),
                PullUpsertRecord::Requisition(requisition_row_3),
                PullUpsertRecord::Requisition(requisition_row_4),
                PullUpsertRecord::RequisitionLine(requisition_line_row_1.clone()),
            ]),
        });

        // STEP 2 - mutate
        let requisition_row_1 = inline_edit(&requisition_row_1, |mut d| {
            d.user_id = Some("test user 2".to_string());
            d.r#type = RequisitionRowType::Response;
            d.status = RequisitionRowStatus::Finalised;
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
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Requisition(requisition_row_1.clone()),
                PullUpsertRecord::Requisition(requisition_row_2.clone()),
                PullUpsertRecord::RequisitionLine(requisition_line_row_1.clone()),
            ]),
        });
        // STEP 3 - delete
        let requisition_row_2 = inline_edit(&requisition_row_2, |mut d| {
            d.linked_requisition_id = None;
            d
        });
        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upsert(PullUpsertRecord::Requisition(
                requisition_row_2,
            ))
            .join(IntegrationRecords::from_deletes(vec![
                PullDeleteRecord {
                    id: requisition_line_row_1.id.clone(),
                    table: PullDeleteRecordTable::RequisitionLine,
                },
                PullDeleteRecord {
                    id: requisition_row_1.id.clone(),
                    table: PullDeleteRecordTable::Requisition,
                },
            ])),
        });
        result
    }
}
