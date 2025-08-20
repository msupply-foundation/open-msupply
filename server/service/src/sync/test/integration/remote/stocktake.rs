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
use util::uuid::uuid;

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
            location_type_id: None,
        };
        let currency_row = CurrencyRow {
            id: uuid(),
            rate: 1.0,
            code: "NZD".to_string(),
            is_home_currency: true,
            date_updated: None,
            is_active: true,
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
            program_id: None,
            counted_by: None,
            verified_by: None,
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
            item_name: "test item".to_string(),
            batch: None,
            expiry_date: None,
            pack_size: Some(0.0),
            cost_price_per_pack: Some(0.0),
            sell_price_per_pack: Some(0.0),
            note: None,
            reason_option_id: None,
            item_variant_id: None,
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
        let invoice_row = InvoiceRow {
            id: uuid(),
            name_link_id: new_site_properties.name_id.clone(),
            store_id: store_id.clone(),
            name_store_id: Some(store_id.clone()),
            tax_percentage: Some(0.0),
            currency_id: Some(currency_row.id.clone()),
            currency_rate: 1.0,
            ..Default::default()
        };

        let stock_line_row = StockLineRow {
            id: uuid(),
            item_link_id: uuid(),
            store_id: store_id.clone(),
            ..Default::default()
        };

        let mut stocktake_row = stocktake_row.clone();
        stocktake_row.user_id = "test user 2".to_string();
        stocktake_row.comment = Some("comment sync test".to_string());
        stocktake_row.description = Some("description sync test".to_string());
        stocktake_row.status = StocktakeStatus::Finalised;
        stocktake_row.stocktake_date = NaiveDate::from_ymd_opt(2022, 03, 23);
        stocktake_row.finalised_datetime = NaiveDate::from_ymd_opt(2022, 03, 24)
            .unwrap()
            .and_hms_opt(8, 15, 30);
        // Not testing that logically invoices are correct inventory adjustments just testing they sync correctly
        stocktake_row.inventory_addition_id = Some(invoice_row.id.clone());
        stocktake_row.inventory_reduction_id = Some(invoice_row.id.clone());
        stocktake_row.is_locked = true;

        let mut stocktake_line_row = stocktake_line_row.clone();
        stocktake_line_row.comment = Some("stocktake line comment".to_string());
        stocktake_line_row.location_id = None;
        stocktake_line_row.snapshot_number_of_packs = 110.12;
        stocktake_line_row.counted_number_of_packs = Some(90.3219);
        stocktake_line_row.item_link_id = stock_line_row.item_link_id.clone();
        stocktake_line_row.stock_line_id = Some(stock_line_row.id.clone());
        stocktake_line_row.batch = Some(uuid());
        stocktake_line_row.expiry_date = NaiveDate::from_ymd_opt(2025, 03, 24);
        stocktake_line_row.pack_size = Some(2.25);
        stocktake_line_row.cost_price_per_pack = Some(gen_f64());
        stocktake_line_row.sell_price_per_pack = Some(gen_f64());
        stocktake_line_row.note = Some("stock_line.note".to_string());

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
