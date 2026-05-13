use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use chrono::NaiveDate;
use repository::{LocationRow, StockLineRow, StockLineRowDelete};
use serde_json::json;
use util::uuid::uuid;
pub struct StockLineRecordTester;
impl SyncRecordTester for StockLineRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let store_id = &new_site_properties.store_id;
        // create test location
        let location_row = LocationRow {
            id: uuid(),
            name: "LocationName".to_string(),
            code: "LocationCode".to_string(),
            on_hold: false,
            store_id: store_id.to_string(),
            location_type_id: None,
            ..Default::default()
        };

        let stock_line_row = StockLineRow {
            id: uuid(),
            item_link_id: uuid(),
            store_id: store_id.to_string(),
            location_id: Some(location_row.id.clone()),
            batch: Some("some remote sync test batch".to_string()),
            pack_size: 5.0,
            cost_price_per_pack: 10.0,
            sell_price_per_pack: 15.0,
            available_number_of_packs: 100.3333,
            total_number_of_packs: 150.0,
            expiry_date: NaiveDate::from_ymd_opt(2021, 03, 21),
            on_hold: true,
            note: Some("some remote sync test note".to_string()),
            supplier_id: Some(new_site_properties.name_id.clone()),
            barcode_id: None,
            item_variant_id: None,
            donor_id: None,
            ..Default::default()
        };

        result.push(TestStepData {
            central_upsert: json!({"item": [{
                "ID": stock_line_row.item_link_id,
                "type_of": "general"
            }]}),
            integration_records: vec![
                IntegrationOperation::upsert(location_row),
                IntegrationOperation::upsert(stock_line_row.clone()),
            ],
            ..Default::default()
        });
        // STEP 2 - mutate
        let mut stock_line_row = stock_line_row.clone();
        stock_line_row.item_link_id = uuid();
        stock_line_row.location_id = None;
        stock_line_row.batch = Some("some remote sync test batch 2".to_string());
        stock_line_row.pack_size = 10.0;
        stock_line_row.cost_price_per_pack = 15.0;
        stock_line_row.sell_price_per_pack = 20.0;
        stock_line_row.available_number_of_packs = 110.393939;
        stock_line_row.total_number_of_packs = 160.2190;
        stock_line_row.expiry_date = NaiveDate::from_ymd_opt(2021, 03, 22);
        stock_line_row.on_hold = false;
        stock_line_row.note = Some("some remote sync test note 2".to_string());
        stock_line_row.supplier_id = None;

        result.push(TestStepData {
            central_upsert: json!({"item": [{
                "ID": stock_line_row.item_link_id,
                "type_of": "general"
            }]}),
            integration_records: vec![IntegrationOperation::upsert(stock_line_row.clone())],
            ..Default::default()
        });
        // STEP 3 - delete
        result.push(TestStepData {
            integration_records: vec![IntegrationOperation::delete(StockLineRowDelete(
                stock_line_row.id,
            ))],
            ..Default::default()
        });
        result
    }
}
