use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullDeleteRecord, PullDeleteRecordTable, PullUpsertRecord},
};
use chrono::NaiveDate;
use repository::mock::mock_request_draft_requisition;
use repository::*;
use serde_json::json;
use util::{inline_edit, inline_init, uuid::uuid};

pub struct InvoiceRecordTester;
impl SyncRecordTester for InvoiceRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let store_id = &new_site_properties.store_id;
        // create test location
        let location_row = LocationRow {
            id: uuid(),
            name: "TestLocation".to_string(),
            code: "TestLocationCode".to_string(),
            on_hold: false,
            store_id: store_id.to_string(),
        };
        let base_invoice_row = InvoiceRow {
            id: uuid(),
            name_id: uuid(),
            name_store_id: Some(uuid()),
            store_id: store_id.to_string(),
            user_id: Some("user 1".to_string()),
            invoice_number: 8,
            r#type: InvoiceRowType::InboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: false,
            comment: None,
            their_reference: None,
            transport_reference: None,
            created_datetime: NaiveDate::from_ymd(2022, 03, 24).and_hms(11, 35, 15),
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
        };
        let base_invoice_line_row = InvoiceLineRow {
            id: uuid(),
            invoice_id: base_invoice_row.id.clone(),
            r#type: InvoiceLineRowType::StockIn,
            item_id: uuid(),
            item_name: uuid(),
            item_code: uuid(),
            stock_line_id: None,
            location_id: Some(location_row.id.clone()),
            batch: None,
            expiry_date: None,
            pack_size: 1,
            cost_price_per_pack: 5.0,
            sell_price_per_pack: 10.0,
            total_before_tax: 8.0,
            total_after_tax: 12.0,
            tax: Some(10.0),
            number_of_packs: 10.129,
            note: None,
        };
        let invoice_row_1 = base_invoice_row.clone();
        let invoice_line_row_1 = base_invoice_line_row.clone();

        let invoice_row_2 = inline_edit(&base_invoice_row, |mut d| {
            d.id = uuid();
            d.r#type = InvoiceRowType::OutboundShipment;
            d.status = InvoiceRowStatus::Allocated;
            d
        });
        let invoice_line_row_2 = inline_edit(&base_invoice_line_row, |mut d| {
            d.id = uuid();
            d.invoice_id = invoice_row_2.id.clone();
            d.r#type = InvoiceLineRowType::UnallocatedStock;
            d
        });
        let invoice_line_row_3 = inline_edit(&base_invoice_line_row, |mut d| {
            d.id = uuid();
            d.invoice_id = invoice_row_2.id.clone();
            d.r#type = InvoiceLineRowType::Service;
            d
        });
        let invoice_line_row_4 = inline_edit(&base_invoice_line_row, |mut d| {
            d.id = uuid();
            d.invoice_id = invoice_row_2.id.clone();
            d.r#type = InvoiceLineRowType::StockIn;
            d
        });
        let invoice_line_row_5 = inline_edit(&base_invoice_line_row, |mut d| {
            d.id = uuid();
            d.invoice_id = invoice_row_2.id.clone();
            d.r#type = InvoiceLineRowType::StockOut;
            d
        });
        let invoice_row_3 = inline_edit(&base_invoice_row, |mut d| {
            d.id = uuid();
            d.r#type = InvoiceRowType::InventoryAdjustment;
            d.status = InvoiceRowStatus::Picked;
            d
        });
        let invoice_row_4 = inline_edit(&base_invoice_row, |mut d| {
            d.id = uuid();
            d.r#type = InvoiceRowType::OutboundShipment;
            d.status = InvoiceRowStatus::Shipped;
            d
        });

        let invoice_row_5 = inline_edit(&base_invoice_row, |mut d| {
            d.id = uuid();
            d.r#type = InvoiceRowType::OutboundShipment;
            d.status = InvoiceRowStatus::Delivered;
            d
        });

        result.push(TestStepData {
            central_upsert: json!({
                "item": [{
                    "ID": base_invoice_line_row.item_id,
                    "name": base_invoice_line_row.item_name,
                    "code": base_invoice_line_row.item_code,
                    "type_of": "general"
                }],
                "name": [{
                    "ID": base_invoice_row.name_id,
                    "type": "store"
                }],
                "store": [{
                    "ID": base_invoice_row.name_store_id.as_ref().unwrap(),
                    "name_ID": base_invoice_row.name_id,
                    "store_mode": "store"
                }]
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Location(location_row),
                PullUpsertRecord::Invoice(invoice_row_1.clone()),
                PullUpsertRecord::Invoice(invoice_row_2.clone()),
                PullUpsertRecord::Invoice(invoice_row_3),
                PullUpsertRecord::Invoice(invoice_row_4),
                PullUpsertRecord::Invoice(invoice_row_5),
                PullUpsertRecord::InvoiceLine(invoice_line_row_1.clone()),
                PullUpsertRecord::InvoiceLine(invoice_line_row_2),
                PullUpsertRecord::InvoiceLine(invoice_line_row_3),
                PullUpsertRecord::InvoiceLine(invoice_line_row_4),
                PullUpsertRecord::InvoiceLine(invoice_line_row_5),
            ]),
        });
        // STEP 2 - mutate
        let stock_line_row = inline_init(|r: &mut StockLineRow| {
            r.id = uuid();
            r.item_id = base_invoice_line_row.item_id;
            r.store_id = new_site_properties.store_id.clone();
            r.batch = Some("some batch".to_string());
            r.pack_size = 20;
            r.cost_price_per_pack = 0.5;
            r.sell_price_per_pack = 0.2;
        });
        // create requisition and linked invoice
        let requisition_row = inline_edit(&mock_request_draft_requisition(), |mut r| {
            r.id = uuid();
            r.name_id = invoice_row_1.name_id.clone();
            r.store_id = store_id.clone();
            r
        });

        let invoice_row_1 = inline_edit(&invoice_row_1, |mut d| {
            d.user_id = Some("test user 2".to_string());
            d.r#type = InvoiceRowType::InboundShipment;
            d.status = InvoiceRowStatus::Verified;
            d.on_hold = true;
            d.comment = Some("invoice comment".to_string());
            d.their_reference = Some("invoice their ref".to_string());
            d.transport_reference = Some("transport reference".to_string());
            d.allocated_datetime = Some(NaiveDate::from_ymd(2022, 03, 25).and_hms(11, 35, 15));
            d.picked_datetime = Some(NaiveDate::from_ymd(2022, 03, 25).and_hms(11, 35, 15));
            d.shipped_datetime = Some(NaiveDate::from_ymd(2022, 03, 26).and_hms(11, 35, 15));
            d.delivered_datetime = Some(NaiveDate::from_ymd(2022, 03, 27).and_hms(11, 35, 15));
            d.verified_datetime = Some(NaiveDate::from_ymd(2022, 03, 28).and_hms(11, 35, 15));
            d.colour = Some("#1A1919".to_string());
            d.requisition_id = Some(requisition_row.id.clone());
            d.linked_invoice_id = Some(invoice_row_2.id.clone());
            d
        });
        let invoice_row_2 = inline_edit(&invoice_row_2, |mut d| {
            d.linked_invoice_id = Some(invoice_row_1.id.clone());
            d
        });

        let invoice_line_row_1 = inline_edit(&invoice_line_row_1, |mut d| {
            d.r#type = InvoiceLineRowType::StockOut;
            d.stock_line_id = Some(stock_line_row.id.clone());
            d.location_id = None;
            d.batch = Some("invoice line batch".to_string());
            d.expiry_date = Some(NaiveDate::from_ymd(2024, 04, 04));
            d.pack_size = 10;
            d.cost_price_per_pack = 15.0;
            d.sell_price_per_pack = 15.0;
            d.total_before_tax = 10.0;
            d.total_after_tax = 15.0;
            // TODO test to unset the tax, this is currently not working but should
            // work with the new push endpoint
            // d.tax = None;
            d.tax = Some(0.0);
            d.number_of_packs = 15.120;
            d.note = Some("invoice line note".to_string());
            d
        });

        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::StockLine(stock_line_row),
                PullUpsertRecord::Requisition(requisition_row),
                PullUpsertRecord::Invoice(invoice_row_1.clone()),
                PullUpsertRecord::Invoice(invoice_row_2.clone()),
                PullUpsertRecord::InvoiceLine(invoice_line_row_1.clone()),
            ]),
        });
        // STEP 3 - delete
        let invoice_row_2 = inline_edit(&invoice_row_2, |mut d| {
            d.linked_invoice_id = None;
            d
        });
        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upsert(PullUpsertRecord::Invoice(
                invoice_row_2,
            ))
            .join(IntegrationRecords::from_deletes(vec![
                PullDeleteRecord {
                    id: invoice_line_row_1.id.clone(),
                    table: PullDeleteRecordTable::InvoiceLine,
                },
                PullDeleteRecord {
                    id: invoice_row_1.id.clone(),
                    table: PullDeleteRecordTable::Invoice,
                },
            ])),
        });
        result
    }
}
