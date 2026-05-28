use crate::sync::translations::requisition_line::{
    LegacyRequisitionLineRow, RequisitionLineOmsFields,
};

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};
use chrono::NaiveDate;
use repository::{
    reshape_legacy_population_fields, RequisitionLineRow, RequisitionLineRowDelete,
};
use serde_json::json;
use util::constants::APPROX_NUMBER_OF_DAYS_IN_A_MONTH_IS_30;

const TABLE_NAME: &str = "requisition_line";

const REQUISITION_LINE_1: (&str, &str) = (
    "66FB0A41C95441ABBBC7905857466089",
    r#"{
        "ID": "66FB0A41C95441ABBBC7905857466089",
        "requisition_ID": "mock_request_draft_requisition3",
        "item_ID": "item_a",
        "stock_on_hand": 10,
        "actualQuan": 2,
        "imprest_or_prev_quantity": 0,
        "colour": -255,
        "line_number": 1,
        "Cust_prev_stock_balance": 0,
        "Cust_stock_received": 0,
        "Cust_stock_order": 102,
        "comment": "",
        "Cust_loss_adjust": 0,
        "days_out_or_new_demand": 0,
        "previous_stock_on_hand": 0,
        "daily_usage": 3,
        "suggested_quantity": 101,
        "adjusted_consumption": 0,
        "linked_requisition_line_ID": "",
        "purchase_order_line_ID": "",
        "optionID": "",
        "Cust_stock_issued": 0,
        "itemName": "Ibuprofen 200mg tablets",
        "stockLosses": 0,
        "stockAdditions": 0,
        "stockExpiring": 0,
        "DOSforAMCadjustment": 0,
        "requestedPackSize": 0,
        "approved_quantity": 0,
        "authoriser_comment": "",
        "om_snapshot_datetime": "",
        "oms_fields": {
            "rnr_form_line_id": "",
            "expiry_date": null,
            "available_volume": 5.0,
            "location_type_id": null
        }
    }"#,
);
fn requisition_line_request_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        REQUISITION_LINE_1,
        RequisitionLineRow {
            id: REQUISITION_LINE_1.0.to_string(),
            requisition_id: "mock_request_draft_requisition3".to_string(),
            item_id: "item_a".to_string(),
            requested_quantity: 102.0,
            suggested_quantity: 101.0,
            supply_quantity: 2.0,
            available_stock_on_hand: 10.0,
            average_monthly_consumption: 3.0 * APPROX_NUMBER_OF_DAYS_IN_A_MONTH_IS_30,
            comment: None,
            snapshot_datetime: None,
            approved_quantity: 0.0,
            approval_comment: None,
            item_name: "Ibuprofen 200mg tablets".to_string(),
            initial_stock_on_hand_units: 0.0,
            incoming_units: 0.0,
            outgoing_units: 0.0,
            loss_in_units: 0.0,
            addition_in_units: 0.0,
            expiring_units: 0.0,
            days_out_of_stock: 0.0,
            option_id: None,
            price_per_unit: None,
            available_volume: Some(5.0),
            location_type_id: None,
            forecast_monthly_usage: None,
            forecast_method: None,
            forecast_data: None,
        },
    )
}
fn requisition_line_request_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: REQUISITION_LINE_1.0.to_string(),
        push_data: json!(LegacyRequisitionLineRow {
            ID: REQUISITION_LINE_1.0.to_string(),
            requisition_ID: "mock_request_draft_requisition3".to_string(),
            item_ID: "item_a".to_string(),
            Cust_stock_order: 102.0,
            suggested_quantity: 101.0,
            actualQuan: 2.0,
            stock_on_hand: 10.0,
            daily_usage: 3.0,
            comment: None,
            snapshot_datetime: None,
            approved_quantity: 0.0,
            approval_comment: None,
            item_name: "Ibuprofen 200mg tablets".to_string(),
            initial_stock_on_hand_units: 10.0,
            incoming_units: 0.0,
            outgoing_units: 0.0,
            loss_in_units: 0.0,
            addition_in_units: 0.0,
            expiring_units: 0.0,
            days_out_of_stock: 0.0,
            option_id: None,
            stock_adjustment_in_units: 0.0,
            oms_fields: Some(RequisitionLineOmsFields {
                rnr_form_line_id: None,
                expiry_date: None,
                price_per_unit: None,
                available_volume: Some(5.0),
                location_type_id: None,
                forecast_monthly_usage: None,
                forecast_method: None,
                forecast_data: None,
                forecast_total_units: None,
                forecast_total_doses: None,
                vaccine_courses: None,
            }),
        }),
    }
}

const REQUISITION_LINE_OM_FIELD: (&str, &str) = (
    "ABCB0A41C95441ABBBC7905857466089",
    r#"{
        "ID": "ABCB0A41C95441ABBBC7905857466089",
        "requisition_ID": "mock_request_draft_requisition3",
        "item_ID": "item_a",
        "stock_on_hand": 10,
        "actualQuan": 2,
        "imprest_or_prev_quantity": 0,
        "colour": -255,
        "line_number": 1,
        "Cust_prev_stock_balance": 0,
        "Cust_stock_received": 0,
        "Cust_stock_order": 102,
        "comment": "Some comment",
        "Cust_loss_adjust": 0,
        "days_out_or_new_demand": 0,
        "previous_stock_on_hand": 0,
        "daily_usage": 3,
        "suggested_quantity": 101,
        "adjusted_consumption": 0,
        "linked_requisition_line_ID": "",
        "purchase_order_line_ID": "",
        "optionID": "",
        "Cust_stock_issued": 0,
        "itemName": "Ibuprofen 200mg tablets",
        "stockLosses": 0,
        "stockAdditions": 0,
        "stockExpiring": 0,
        "DOSforAMCadjustment": 0,
        "requestedPackSize": 0,
        "approved_quantity": 0,
        "authoriser_comment": "approval comment",
        "om_snapshot_datetime": "2022-04-04T14:48:11",
        "oms_fields": {
            "rnr_form_line_id": "rnr_form_line_with_expiry",
            "expiry_date": "2023-12-31",
            "price_per_unit": 1.1,
            "available_volume": null,
            "location_type_id": null,
            "forecast_monthly_usage": null,
            "forecast_method": null,
            "forecast_data": null
        }
    }"#,
);
fn requisition_line_om_fields_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        REQUISITION_LINE_OM_FIELD,
        RequisitionLineRow {
            id: REQUISITION_LINE_OM_FIELD.0.to_string(),
            requisition_id: "mock_request_draft_requisition3".to_string(),
            item_id: "item_a".to_string(),
            requested_quantity: 102.0,
            suggested_quantity: 101.0,
            supply_quantity: 2.0,
            available_stock_on_hand: 10.0,
            approved_quantity: 0.0,
            approval_comment: Some("approval comment".to_string()),
            average_monthly_consumption: 3.0 * APPROX_NUMBER_OF_DAYS_IN_A_MONTH_IS_30,
            comment: Some("Some comment".to_string()),
            snapshot_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 4, 4)
                    .unwrap()
                    .and_hms_opt(14, 48, 11)
                    .unwrap(),
            ),
            item_name: "Ibuprofen 200mg tablets".to_string(),
            initial_stock_on_hand_units: 0.0,
            incoming_units: 0.0,
            outgoing_units: 0.0,
            loss_in_units: 0.0,
            addition_in_units: 0.0,
            expiring_units: 0.0,
            days_out_of_stock: 0.0,
            option_id: None,
            price_per_unit: Some(1.1),
            available_volume: None,
            location_type_id: None,
            forecast_monthly_usage: None,
            forecast_method: None,
            forecast_data: None,
        },
    )
}
fn requisition_line_om_fields_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: REQUISITION_LINE_OM_FIELD.0.to_string(),
        push_data: json!(LegacyRequisitionLineRow {
            ID: REQUISITION_LINE_OM_FIELD.0.to_string(),
            requisition_ID: "mock_request_draft_requisition3".to_string(),
            item_ID: "item_a".to_string(),
            Cust_stock_order: 102.0,
            suggested_quantity: 101.0,
            actualQuan: 2.0,
            stock_on_hand: 10.0,
            daily_usage: 3.0,
            approved_quantity: 0.0,
            approval_comment: Some("approval comment".to_string()),
            comment: Some("Some comment".to_string()),
            item_name: "Ibuprofen 200mg tablets".to_string(),
            snapshot_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 4, 4)
                    .unwrap()
                    .and_hms_opt(14, 48, 11)
                    .unwrap()
            ),
            initial_stock_on_hand_units: 10.0,
            incoming_units: 0.0,
            outgoing_units: 0.0,
            loss_in_units: 0.0,
            addition_in_units: 0.0,
            expiring_units: 0.0,
            days_out_of_stock: 0.0,
            option_id: None,
            stock_adjustment_in_units: 0.0,
            oms_fields: Some(RequisitionLineOmsFields {
                rnr_form_line_id: Some("rnr_form_line_with_expiry".to_string()),
                expiry_date: Some(NaiveDate::from_ymd_opt(2023, 12, 31).unwrap()),
                price_per_unit: Some(1.1),
                available_volume: None,
                location_type_id: None,
                forecast_monthly_usage: None,
                forecast_method: None,
                forecast_data: None,
                forecast_total_units: None,
                forecast_total_doses: None,
                vaccine_courses: None,
            }),
        }),
    }
}

// ---- Legacy population back-compat fixtures ----------------------------
//
// Represents what a pre-v2.20 OMS site sends: the three legacy population
// fields populated, `forecast_data` / `forecast_method` /
// `forecast_monthly_usage` absent inside `oms_fields`. The pull translation
// must synthesise a `Population(Ok)` snapshot and populate all three new
// columns from it.

const REQUISITION_LINE_LEGACY_POPULATION: (&str, &str) = (
    "CDC1A0F900E5436F8B7F1F1F9F1F9F00",
    r#"{
        "ID": "CDC1A0F900E5436F8B7F1F1F9F1F9F00",
        "requisition_ID": "mock_request_draft_requisition3",
        "item_ID": "item_a",
        "stock_on_hand": 0,
        "actualQuan": 0,
        "Cust_prev_stock_balance": 0,
        "Cust_stock_received": 0,
        "Cust_stock_order": 0,
        "comment": "",
        "Cust_loss_adjust": 0,
        "days_out_or_new_demand": 0,
        "daily_usage": 0,
        "suggested_quantity": 0,
        "optionID": "",
        "Cust_stock_issued": 0,
        "itemName": "Ibuprofen 200mg tablets",
        "stockLosses": 0,
        "stockAdditions": 0,
        "stockExpiring": 0,
        "approved_quantity": 0,
        "authoriser_comment": "",
        "om_snapshot_datetime": "",
        "oms_fields": {
            "rnr_form_line_id": null,
            "expiry_date": null,
            "price_per_unit": null,
            "available_volume": null,
            "location_type_id": null,
            "forecast_total_units": 1875.0,
            "forecast_total_doses": 3750.0,
            "vaccine_courses": "[{\"courseTitle\":\"X\",\"numberOfDoses\":3,\"coverageRate\":60,\"targetPopulation\":2500,\"wastageRate\":50,\"lossFactor\":2,\"annualTargetDoses\":9000,\"bufferStockMonths\":2,\"supplyPeriodMonths\":3,\"dosesPerUnit\":2,\"forecastDoses\":3750,\"forecastUnits\":1875}]"
        }
    }"#,
);

fn requisition_line_legacy_population_pull_record() -> TestSyncIncomingRecord {
    // Build the expected snapshot via the same reshape helper the production
    // pull path uses — guarantees JSON byte-for-byte equality through the
    // snapshot Serialize impl, not through serde_json::Value's
    // alphabetical-key ordering.
    let snap = reshape_legacy_population_fields(
        Some(LEGACY_VACCINE_COURSES_JSON),
        Some(3750.0),
    )
    .expect("legacy population reshape");
    let expected_data = serde_json::to_string(&snap).unwrap();
    let expected_monthly_usage = match &snap {
        repository::ForecastSnapshot::Population(repository::PopulationOutcome::Ok(p)) => {
            p.forecast_monthly_usage
        }
        _ => unreachable!(),
    };
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        REQUISITION_LINE_LEGACY_POPULATION,
        RequisitionLineRow {
            id: REQUISITION_LINE_LEGACY_POPULATION.0.to_string(),
            requisition_id: "mock_request_draft_requisition3".to_string(),
            item_id: "item_a".to_string(),
            requested_quantity: 0.0,
            suggested_quantity: 0.0,
            supply_quantity: 0.0,
            available_stock_on_hand: 0.0,
            average_monthly_consumption: 0.0,
            comment: None,
            snapshot_datetime: None,
            approved_quantity: 0.0,
            approval_comment: None,
            item_name: "Ibuprofen 200mg tablets".to_string(),
            initial_stock_on_hand_units: 0.0,
            incoming_units: 0.0,
            outgoing_units: 0.0,
            loss_in_units: 0.0,
            addition_in_units: 0.0,
            expiring_units: 0.0,
            days_out_of_stock: 0.0,
            option_id: None,
            price_per_unit: None,
            available_volume: None,
            location_type_id: None,
            forecast_monthly_usage: Some(expected_monthly_usage),
            forecast_method: Some("population".to_string()),
            forecast_data: Some(expected_data),
        },
    )
}

const LEGACY_VACCINE_COURSES_JSON: &str = r#"[{"courseTitle":"X","numberOfDoses":3,"coverageRate":60,"targetPopulation":2500,"wastageRate":50,"lossFactor":2,"annualTargetDoses":9000,"bufferStockMonths":2,"supplyPeriodMonths":3,"dosesPerUnit":2,"forecastDoses":3750,"forecastUnits":1875}]"#;

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        requisition_line_request_pull_record(),
        requisition_line_om_fields_pull_record(),
        requisition_line_legacy_population_pull_record(),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        REQUISITION_LINE_OM_FIELD.0,
        RequisitionLineRowDelete(REQUISITION_LINE_OM_FIELD.0.to_string()),
    )]
}

// Push counterpart to `requisition_line_legacy_population_pull_record`: after
// the legacy pull synthesises the snapshot and stores it in `forecast_data`,
// pushing the same row back out must emit both the new
// (`forecast_method`/`forecast_data`/`forecast_monthly_usage`) and the legacy
// (`forecast_total_units`/`forecast_total_doses`/`vaccine_courses`) fields,
// derived from the snapshot. This is what `to_legacy_population_fields`
// produces.
fn requisition_line_legacy_population_push_record() -> TestSyncOutgoingRecord {
    let snap = reshape_legacy_population_fields(
        Some(LEGACY_VACCINE_COURSES_JSON),
        Some(3750.0),
    )
    .expect("legacy population reshape");
    let snapshot_json = serde_json::to_string(&snap).unwrap();
    let monthly_usage = match &snap {
        repository::ForecastSnapshot::Population(repository::PopulationOutcome::Ok(p)) => {
            p.forecast_monthly_usage
        }
        _ => unreachable!(),
    };
    let legacy = repository::to_legacy_population_fields(&snap).unwrap();

    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: REQUISITION_LINE_LEGACY_POPULATION.0.to_string(),
        push_data: json!(LegacyRequisitionLineRow {
            ID: REQUISITION_LINE_LEGACY_POPULATION.0.to_string(),
            requisition_ID: "mock_request_draft_requisition3".to_string(),
            item_ID: "item_a".to_string(),
            Cust_stock_order: 0.0,
            suggested_quantity: 0.0,
            actualQuan: 0.0,
            stock_on_hand: 0.0,
            daily_usage: 0.0,
            comment: None,
            snapshot_datetime: None,
            approved_quantity: 0.0,
            approval_comment: None,
            item_name: "Ibuprofen 200mg tablets".to_string(),
            initial_stock_on_hand_units: 0.0,
            incoming_units: 0.0,
            outgoing_units: 0.0,
            loss_in_units: 0.0,
            addition_in_units: 0.0,
            expiring_units: 0.0,
            days_out_of_stock: 0.0,
            option_id: None,
            stock_adjustment_in_units: 0.0,
            oms_fields: Some(RequisitionLineOmsFields {
                rnr_form_line_id: None,
                expiry_date: None,
                price_per_unit: None,
                available_volume: None,
                location_type_id: None,
                forecast_monthly_usage: Some(monthly_usage),
                forecast_method: Some("population".to_string()),
                forecast_data: Some(snapshot_json),
                forecast_total_units: Some(legacy.forecast_total_units),
                forecast_total_doses: Some(legacy.forecast_total_doses),
                vaccine_courses: Some(legacy.vaccine_courses),
            }),
        }),
    }
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        requisition_line_request_push_record(),
        requisition_line_om_fields_push_record(),
        requisition_line_legacy_population_push_record(),
    ]
}
