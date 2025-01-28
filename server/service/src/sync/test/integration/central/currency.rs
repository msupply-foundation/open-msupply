use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};

use repository::CurrencyRow;
use serde_json::json;
use util::uuid::uuid;

pub(crate) struct CurrencyTester;

impl SyncRecordTester for CurrencyTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let currency_row1 = CurrencyRow {
            id: uuid(),
            rate: 1.0,
            code: "NZD".to_string(),
            is_home_currency: true,
            date_updated: None,
        };
        let currency_json1 = json!({
            "ID": currency_row1.id,
            "rate": currency_row1.rate,
            "currency": currency_row1.code,
            "is_home_currency": true,
        });

        let currency_row2 = CurrencyRow {
            id: uuid(),
            rate: 1.0,
            code: "USD".to_string(),
            is_home_currency: false,
            date_updated: None,
        };
        let currency_json2 = json!({
            "ID": currency_row2.id,
            "rate": currency_row2.rate,
            "currency": currency_row2.code,
            "is_home_currency": false,
        });

        result.push(TestStepData {
            central_upsert: json!({
                "currency": [currency_json1, currency_json2],
            }),
            integration_records: vec![
                IntegrationOperation::upsert(currency_row1),
                IntegrationOperation::upsert(currency_row2),
            ],
            ..Default::default()
        });

        result
    }
}
