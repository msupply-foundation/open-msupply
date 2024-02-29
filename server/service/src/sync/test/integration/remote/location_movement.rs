use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullUpsertRecord},
};
use chrono::NaiveDate;
use repository::{LocationMovementRow, LocationRow, StockLineRow};
use serde_json::json;
use util::{inline_edit, uuid::uuid};

pub struct LocationMovementRecordTester;
impl SyncRecordTester for LocationMovementRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let store_id = &new_site_properties.store_id;
        let location_row = LocationRow {
            id: uuid(),
            name: "LocationName".to_string(),
            code: "LocationCode".to_string(),
            on_hold: false,
            store_id: store_id.clone(),
        };
        let stock_line_row = StockLineRow {
            id: uuid(),
            item_link_id: uuid(),
            store_id: store_id.clone(),
            location_id: Some(location_row.id.clone()),
            batch: Some("some remote sync test batch".to_string()),
            pack_size: 5,
            cost_price_per_pack: 10.0,
            sell_price_per_pack: 15.0,
            available_number_of_packs: 100.3333,
            total_number_of_packs: 150.0,
            expiry_date: NaiveDate::from_ymd_opt(2021, 03, 21),
            on_hold: true,
            note: Some("some remote sync test note".to_string()),
            supplier_link_id: Some(new_site_properties.name_id.clone()),
            barcode_id: None,
        };

        let location_movement_row = LocationMovementRow {
            id: uuid(),
            store_id: store_id.clone(),
            stock_line_id: stock_line_row.id.clone(),
            location_id: None,
            enter_datetime: None,
            exit_datetime: None,
        };

        result.push(TestStepData {
            central_upsert: json!({"item": [{
                "ID": stock_line_row.item_link_id,
                "type_of": "general"
            }]}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Location(location_row.clone()),
                PullUpsertRecord::StockLine(stock_line_row.clone()),
                PullUpsertRecord::LocationMovement(location_movement_row.clone()),
            ]),
        });

        // STEP 2 - mutate
        let location_movement = inline_edit(&location_movement_row, |mut d| {
            d.location_id = Some(location_row.id.clone());
            d.enter_datetime = Some(
                NaiveDate::from_ymd_opt(2023, 5, 2)
                    .unwrap()
                    .and_hms_opt(23, 16, 10)
                    .unwrap(),
            );
            d.exit_datetime = Some(
                NaiveDate::from_ymd_opt(2023, 5, 3)
                    .unwrap()
                    .and_hms_opt(13, 26, 12)
                    .unwrap(),
            );
            d
        });
        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::LocationMovement(location_movement.clone()),
            ]),
        });

        result
    }
}
