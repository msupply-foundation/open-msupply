use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use chrono::NaiveDate;
use repository::mock::mock_request_draft_requisition;
use repository::*;
use serde_json::json;
use util::uuid::uuid;

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
            location_type_id: None,
            ..Default::default()
        };
        // create test home currency
        let currency_row = CurrencyRow {
            id: uuid(),
            rate: 1.0,
            code: "NZD".to_string(),
            is_home_currency: true,
            date_updated: None,
            is_active: true,
        };
        // test option (inventory adjustment reason)
        let inventory_adjustment_reason_id = uuid();
        let base_invoice_row = InvoiceRow {
            id: uuid(),
            name_id: uuid(),
            name_store_id: Some(uuid()),
            store_id: store_id.to_string(),
            user_id: Some("user 1".to_string()),
            invoice_number: 8,
            r#type: InvoiceType::InboundShipment,
            status: InvoiceStatus::New,
            on_hold: false,
            comment: None,
            their_reference: None,
            transport_reference: None,
            created_datetime: NaiveDate::from_ymd_opt(2022, 03, 24)
                .unwrap()
                .and_hms_opt(11, 35, 15)
                .unwrap(),
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            clinician_link_id: None,
            currency_id: Some(currency_row.id.clone()),
            currency_rate: 1.0,
            // Tax on invoice/transact is not nullable in mSupply
            tax_percentage: Some(0.0),
            original_shipment_id: None,
            backdated_datetime: None,
            diagnosis_id: None,
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            cancelled_datetime: None,
            is_cancellation: false,
            expected_delivery_date: None,
            ..Default::default()
        };
        let base_invoice_line_row = InvoiceLineRow {
            id: uuid(),
            invoice_id: base_invoice_row.id.clone(),
            r#type: InvoiceLineType::StockIn,
            item_link_id: uuid(),
            item_name: uuid(),
            item_code: uuid(),
            stock_line_id: None,
            location_id: Some(location_row.id.clone()),
            batch: None,
            expiry_date: None,
            pack_size: 1.0,
            cost_price_per_pack: 5.0,
            sell_price_per_pack: 10.0,
            total_before_tax: 8.0,
            total_after_tax: 12.0,
            tax_percentage: Some(10.0),
            number_of_packs: 10.129,
            foreign_currency_price_before_tax: Some(8.0),
            reason_option_id: None, // TODO: Add test to update this with update_inventory_adjustment_reason_id
            note: None,
            item_variant_id: None,
            prescribed_quantity: None,
            linked_invoice_id: None,
            donor_link_id: None,
            ..Default::default()
        };
        let invoice_row_1 = base_invoice_row.clone();
        let invoice_line_row_1 = base_invoice_line_row.clone();

        let invoice_row_2 = {
            let mut d = base_invoice_row.clone();
            d.id = uuid();
            d.r#type = InvoiceType::OutboundShipment;
            d.status = InvoiceStatus::Allocated;
            d
        };
        let invoice_line_row_2 = {
            let mut d = base_invoice_line_row.clone();
            d.id = uuid();
            d.invoice_id = invoice_row_2.id.clone();
            d.r#type = InvoiceLineType::UnallocatedStock;
            d
        };
        let invoice_line_row_3 = {
            let mut d = base_invoice_line_row.clone();
            d.id = uuid();
            d.invoice_id = invoice_row_2.id.clone();
            d.r#type = InvoiceLineType::Service;
            d
        };
        let invoice_line_row_4 = {
            let mut d = base_invoice_line_row.clone();
            d.id = uuid();
            d.invoice_id = invoice_row_2.id.clone();
            d.r#type = InvoiceLineType::StockIn;
            d
        };
        let invoice_line_row_5 = {
            let mut d = base_invoice_line_row.clone();
            d.id = uuid();
            d.invoice_id = invoice_row_2.id.clone();
            d.r#type = InvoiceLineType::StockOut;
            d
        };
        let invoice_row_3 = {
            let mut d = base_invoice_row.clone();
            d.id = uuid();
            d.r#type = InvoiceType::OutboundShipment;
            d.status = InvoiceStatus::Shipped;
            d
        };

        let invoice_row_4 = {
            let mut d = base_invoice_row.clone();
            d.id = uuid();
            d.r#type = InvoiceType::OutboundShipment;
            d.status = InvoiceStatus::Delivered;
            d
        };
        // Inventory adjustments should link to correct name
        let invoice_row_5 = {
            let mut d = base_invoice_row.clone();
            d.id = uuid();
            d.r#type = InvoiceType::InventoryAddition;
            d.status = InvoiceStatus::Picked;
            d
        };
        let invoice_row_6 = {
            let mut d = base_invoice_row.clone();
            d.id = uuid();
            d.r#type = InvoiceType::InventoryReduction;
            d.status = InvoiceStatus::Picked;
            d
        };

        result.push(TestStepData {
            central_upsert: json!({
                "item": [{
                    "ID": base_invoice_line_row.item_link_id,
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
                }],
                "options": [{
                    "ID": inventory_adjustment_reason_id,
                    "isActive": true,
                    "title": "POS 1",
                    "type": "positiveInventoryAdjustment"
                }],
                "currency": [{
                    "ID": currency_row.id,
                    "rate": 1,
                    "code": "NZD",
                    "isHomeCurrency": true,
                    "dateUpdated": null
                }],
            }),
            integration_records: vec![
                IntegrationOperation::upsert(location_row),
                IntegrationOperation::upsert(invoice_row_1.clone()),
                IntegrationOperation::upsert(invoice_row_2.clone()),
                IntegrationOperation::upsert(invoice_row_3),
                IntegrationOperation::upsert(invoice_row_4),
                IntegrationOperation::upsert(invoice_row_5),
                IntegrationOperation::upsert(invoice_row_6),
                IntegrationOperation::upsert(invoice_line_row_1.clone()),
                IntegrationOperation::upsert(invoice_line_row_2),
                IntegrationOperation::upsert(invoice_line_row_3),
                IntegrationOperation::upsert(invoice_line_row_4),
                IntegrationOperation::upsert(invoice_line_row_5),
            ],
            ..Default::default()
        });
        // STEP 2 - mutate
        let stock_line_row = StockLineRow {
            id: uuid(),
            item_link_id: base_invoice_line_row.item_link_id,
            store_id: new_site_properties.store_id.clone(),
            batch: Some("some batch".to_string()),
            pack_size: 20.0,
            cost_price_per_pack: 0.5,
            sell_price_per_pack: 0.2,
            ..Default::default()
        };
        // create requisition and linked invoice
        let mut requisition_row = mock_request_draft_requisition().clone();
        requisition_row.id = uuid();
        requisition_row.name_id = invoice_row_1.name_id.clone();
        requisition_row.store_id = store_id.clone();

        let invoice_row_1 = {
            let mut d = invoice_row_1.clone();
            d.user_id = Some("test user 2".to_string());
            d.r#type = InvoiceType::InboundShipment;
            d.status = InvoiceStatus::Verified;
            d.on_hold = true;
            d.comment = Some("invoice comment".to_string());
            d.their_reference = Some("invoice their ref".to_string());
            d.transport_reference = Some("transport reference".to_string());
            d.allocated_datetime = NaiveDate::from_ymd_opt(2022, 03, 25)
                .unwrap()
                .and_hms_opt(11, 35, 15);
            d.picked_datetime = NaiveDate::from_ymd_opt(2022, 03, 25)
                .unwrap()
                .and_hms_opt(11, 35, 15);
            d.shipped_datetime = NaiveDate::from_ymd_opt(2022, 03, 26)
                .unwrap()
                .and_hms_opt(11, 35, 15);
            d.delivered_datetime = NaiveDate::from_ymd_opt(2022, 03, 27)
                .unwrap()
                .and_hms_opt(11, 35, 15);
            d.verified_datetime = NaiveDate::from_ymd_opt(2022, 03, 28)
                .unwrap()
                .and_hms_opt(11, 35, 15);
            d.colour = Some("#1A1919".to_string());
            d.requisition_id = Some(requisition_row.id.clone());
            d.linked_invoice_id = Some(invoice_row_2.id.clone());
            d
        };
        let invoice_row_2 = {
            let mut d = invoice_row_2.clone();
            d.linked_invoice_id = Some(invoice_row_1.id.clone());
            d
        };

        let invoice_line_row_1 = {
            let mut d = invoice_line_row_1.clone();
            d.r#type = InvoiceLineType::StockOut;
            d.stock_line_id = Some(stock_line_row.id.clone());
            d.location_id = None;
            d.batch = Some("invoice line batch".to_string());
            d.expiry_date = NaiveDate::from_ymd_opt(2024, 04, 04);
            d.pack_size = 10.0;
            d.cost_price_per_pack = 15.0;
            d.sell_price_per_pack = 15.0;
            d.total_before_tax = 10.0;
            d.total_after_tax = 15.0;
            d.tax_percentage = Some(10.0);
            d.number_of_packs = 15.120;
            d.note = Some("invoice line note".to_string());
            d.foreign_currency_price_before_tax = Some(10.0);
            d
        };

        result.push(TestStepData {
            integration_records: vec![
                IntegrationOperation::upsert(stock_line_row),
                IntegrationOperation::upsert(requisition_row),
                IntegrationOperation::upsert(invoice_row_1.clone()),
                IntegrationOperation::upsert(invoice_row_2.clone()),
                IntegrationOperation::upsert(invoice_line_row_1.clone()),
            ],
            ..Default::default()
        });
        // STEP 3 - delete
        let invoice_row_2 = {
            let mut d = invoice_row_2.clone();
            d.linked_invoice_id = None;
            d
        };
        result.push(TestStepData {
            integration_records: vec![
                IntegrationOperation::upsert(invoice_row_2),
                IntegrationOperation::delete(InvoiceLineRowDelete(invoice_line_row_1.id.clone())),
                IntegrationOperation::delete(InvoiceRowDelete(invoice_row_1.id.clone())),
            ],
            ..Default::default()
        });
        result
    }
}
