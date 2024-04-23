use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use chrono::NaiveDate;
use rand::{thread_rng, Rng};
use repository::*;
use serde_json::json;
use util::{inline_edit, inline_init, uuid::uuid};

fn gen_f64() -> f64 {
    format!("{:.6}", thread_rng().gen::<f64>()).parse().unwrap()
}
pub(crate) struct StocktakeRecordTester;
impl SyncRecordTester for StocktakeRecordTester {
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
        let currency_row = CurrencyRow {
            id: uuid(),
            rate: 1.0,
            code: "NZD".to_string(),
            is_home_currency: true,
            date_updated: None,
        };
        let stocktake_row = StocktakeRow {
            id: uuid(),
            store_id: store_id.to_string(),
            user_id: "test user".to_string(),
            stocktake_number: 55,
            comment: None,
            description: None,
            status: StocktakeStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2022, 03, 22)
                .unwrap()
                .and_hms_opt(9, 51, 0)
                .unwrap(),
            stocktake_date: None,
            finalised_datetime: None,
            inventory_addition_id: None,
            inventory_reduction_id: None,
            is_locked: true,
        };
        let stocktake_line_row = StocktakeLineRow {
            id: uuid(),
            stocktake_id: stocktake_row.id.clone(),
            stock_line_id: None,
            location_id: Some(location_row.id.clone()),
            comment: None,
            snapshot_number_of_packs: 100.13,
            counted_number_of_packs: None,
            item_link_id: uuid(),
            batch: None,
            expiry_date: None,
            pack_size: Some(0),
            cost_price_per_pack: Some(0.0),
            sell_price_per_pack: Some(0.0),
            note: None,
            inventory_adjustment_reason_id: None,
        };
        result.push(TestStepData {
            central_upsert: json!({"item": [{
                "ID": stocktake_line_row.item_link_id,
                "type_of": "general"
            }],
            "currency": [{
                "ID": currency_row.id,
                "rate": currency_row.rate,
                "currency": currency_row.code,
                "is_home_currency": currency_row.is_home_currency,
            }]}),
            integration_records: vec![
                IntegrationOperation::upsert(location_row),
                IntegrationOperation::upsert(stocktake_row.clone()),
                IntegrationOperation::upsert(stocktake_line_row.clone()),
            ],
            ..Default::default()
        });
        // STEP 2 - mutate
        let invoice_row = inline_init(|r: &mut InvoiceRow| {
            r.id = uuid();
            r.name_link_id = new_site_properties.name_id.clone();
            r.store_id = store_id.clone();
            r.name_store_id = Some(store_id.clone());
            r.tax = Some(0.0);
            r.currency_id = currency_row.id.clone();
        });

        let stock_line_row = inline_init(|r: &mut StockLineRow| {
            r.id = uuid();
            r.item_link_id = uuid();
            r.store_id = store_id.clone();
        });

        let stocktake_row = inline_edit(&stocktake_row, |mut d| {
            d.user_id = "test user 2".to_string();
            d.comment = Some("comment sync test".to_string());
            d.description = Some("description sync test".to_string());
            d.status = StocktakeStatus::Finalised;
            d.stocktake_date = NaiveDate::from_ymd_opt(2022, 03, 23);
            d.finalised_datetime = NaiveDate::from_ymd_opt(2022, 03, 24)
                .unwrap()
                .and_hms_opt(8, 15, 30);
            // Not testing that logically invoices are correct inventory adjustments just testing they sync correctly
            d.inventory_addition_id = Some(invoice_row.id.clone());
            d.inventory_reduction_id = Some(invoice_row.id.clone());
            d.is_locked = true;
            d
        });

        let stocktake_line_row = inline_edit(&stocktake_line_row, |mut d| {
            d.comment = Some("stocktake line comment".to_string());
            d.location_id = None;
            d.snapshot_number_of_packs = 110.12;
            d.counted_number_of_packs = Some(90.3219);
            d.item_link_id = stock_line_row.item_link_id.clone();
            d.stock_line_id = Some(stock_line_row.id.clone());
            d.batch = Some(uuid());
            d.expiry_date = NaiveDate::from_ymd_opt(2025, 03, 24);
            d.pack_size = Some(thread_rng().gen::<i32>());
            d.cost_price_per_pack = Some(gen_f64());
            d.sell_price_per_pack = Some(gen_f64());
            d.note = Some("stock_line.note".to_string());
            d
        });

        result.push(TestStepData {
            central_upsert: json!({"item": [{
                "ID": stock_line_row.item_link_id,
                "type_of": "general"
            }],
            "currency": [{
                "ID": currency_row.id,
                "rate": currency_row.rate,
                "currency": currency_row.code,
                "is_home_currency": currency_row.is_home_currency,
            }]}),
            integration_records: vec![
                IntegrationOperation::upsert(invoice_row),
                IntegrationOperation::upsert(stock_line_row.clone()),
                IntegrationOperation::upsert(stocktake_row.clone()),
                IntegrationOperation::upsert(stocktake_line_row.clone()),
            ],
            ..Default::default()
        });
        // STEP 3 - delete
        result.push(TestStepData {
            integration_records: vec![
                IntegrationOperation::delete(StocktakeLineRowDelete(stocktake_line_row.id.clone())),
                IntegrationOperation::delete(StocktakeRowDelete(stocktake_row.id.clone())),
            ],
            ..Default::default()
        });
        result
    }
}
