//! The SQL of the transaction reports (standard_reports/transactions-items-by-name and
//! standard_reports/transaction-lines-with-donor), run against mock data on whichever backend
//! the tests are built for. The queries are read from the report folders, so this tests the
//! SQL the reports ship.

use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, ReportQueryExecutor,
    ReportSqlQuery, SqlParameters,
    mock::{
        MockData, MockDataInserts, mock_item_a, mock_item_b, mock_name_a, mock_name_b,
        mock_name_store_b, mock_store_a, mock_store_b,
    },
    test_db::setup_all_with_data,
};
use serde_json::{Value, json};

const ITEMS_BY_NAME_SQLITE: &str = include_str!(
    "../../../../standard_reports/transactions-items-by-name/latest/src/itemsByName.sqlite.sql"
);
const ITEMS_BY_NAME_POSTGRES: &str = include_str!(
    "../../../../standard_reports/transactions-items-by-name/latest/src/itemsByName.postgres.sql"
);
const LINES_SQLITE: &str = include_str!(
    "../../../../standard_reports/transaction-lines-with-donor/latest/src/lines.sqlite.sql"
);
const LINES_POSTGRES: &str = include_str!(
    "../../../../standard_reports/transaction-lines-with-donor/latest/src/lines.postgres.sql"
);

fn datetime(month: u32, day: u32) -> Option<NaiveDateTime> {
    NaiveDate::from_ymd_opt(2026, month, day)
        .unwrap()
        .and_hms_opt(10, 0, 0)
}

fn outbound(id: &str, name_id: &str) -> InvoiceRow {
    InvoiceRow {
        id: id.to_string(),
        store_id: mock_store_a().id,
        name_id: name_id.to_string(),
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Shipped,
        ..Default::default()
    }
}

fn line(id: &str, invoice_id: &str, item_id: &str, packs: f64, total: f64) -> InvoiceLineRow {
    InvoiceLineRow {
        id: id.to_string(),
        invoice_id: invoice_id.to_string(),
        item_id: item_id.to_string(),
        r#type: InvoiceLineType::StockOut,
        pack_size: 10.0,
        number_of_packs: packs,
        total_before_tax: total,
        ..Default::default()
    }
}

fn mock_data() -> MockData {
    let to_name_a = InvoiceRow {
        picked_datetime: datetime(1, 10),
        invoice_number: 1,
        ..outbound("to_name_a", &mock_name_a().id)
    };
    // A stock transfer to store B: counted like any other shipment
    let to_store_b = InvoiceRow {
        name_store_id: Some(mock_store_b().id),
        picked_datetime: datetime(1, 20),
        invoice_number: 2,
        ..outbound("to_store_b", &mock_name_store_b().id)
    };
    // Neither of these has moved stock, so neither counts
    let cancelled = InvoiceRow {
        status: InvoiceStatus::Cancelled,
        picked_datetime: datetime(1, 12),
        ..outbound("cancelled", &mock_name_a().id)
    };
    let not_picked = InvoiceRow {
        status: InvoiceStatus::New,
        ..outbound("not_picked", &mock_name_a().id)
    };
    // The other transaction type, confirmed when received
    let inbound = InvoiceRow {
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Received,
        received_datetime: datetime(1, 15),
        ..outbound("inbound", &mock_name_a().id)
    };

    MockData {
        invoices: vec![to_name_a, to_store_b, cancelled, not_picked, inbound],
        invoice_lines: vec![
            InvoiceLineRow {
                donor_id: Some(mock_name_b().id),
                ..line("a1", "to_name_a", &mock_item_a().id, 2.0, 20.0)
            },
            line("a2", "to_name_a", &mock_item_a().id, 1.0, 12.0),
            line("a3", "to_name_a", &mock_item_b().id, 0.5, 7.5),
            line("b1", "to_store_b", &mock_item_a().id, 3.0, 30.0),
            line("c1", "cancelled", &mock_item_a().id, 1.0, 10.0),
            line("n1", "not_picked", &mock_item_a().id, 1.0, 10.0),
            InvoiceLineRow {
                r#type: InvoiceLineType::StockIn,
                ..line("i1", "inbound", &mock_item_a().id, 1.0, 10.0)
            },
        ],
        ..Default::default()
    }
}

/// The arguments the front end sends when nothing is changed: sales to customers, with the
/// dates left empty and so sent as null.
fn arguments(overrides: Value) -> SqlParameters {
    let mut arguments = json!({
        "storeId": mock_store_a().id,
        "transactionType": "OUTBOUND_SHIPMENT",
        "after": null,
        "before": null,
    });
    for (key, value) in overrides.as_object().unwrap() {
        arguments[key] = value.clone();
    }
    arguments.as_object().unwrap().clone()
}

fn run(
    executor: &ReportQueryExecutor,
    sqlite: &str,
    postgres: &str,
    overrides: Value,
) -> Vec<Value> {
    let query = ReportSqlQuery {
        name: "query".to_string(),
        sqlite: sqlite.to_string(),
        postgres: postgres.to_string(),
    };
    executor
        .run(vec![query], &arguments(overrides))
        .unwrap()
        .remove(0)
        .1
}

/// Each item and other party as `item, name, quantity, value`, sorted, so the assertions
/// don't depend on row order.
fn cells(rows: Vec<Value>) -> Vec<(String, String, f64, f64)> {
    let mut cells: Vec<_> = rows
        .into_iter()
        .map(|row| {
            (
                row["item_id"].as_str().unwrap().to_string(),
                row["name_id"].as_str().unwrap().to_string(),
                row["quantity"].as_f64().unwrap(),
                row["value"].as_f64().unwrap(),
            )
        })
        .collect();
    cells.sort_by(|a, b| (&a.0, &a.1).cmp(&(&b.0, &b.1)));
    cells
}

#[actix_rt::test]
async fn items_by_name_totals_each_item_with_each_other_party() {
    let (_, _, connection_manager, _) = setup_all_with_data(
        "items_by_name_totals_each_item_with_each_other_party",
        MockDataInserts::none().names().stores().units().items(),
        mock_data(),
    )
    .await;
    let executor = ReportQueryExecutor::new(&connection_manager);
    let items_by_name = |overrides| {
        cells(run(
            &executor,
            ITEMS_BY_NAME_SQLITE,
            ITEMS_BY_NAME_POSTGRES,
            overrides,
        ))
    };

    let item_a = mock_item_a().id;
    let item_b = mock_item_b().id;
    let name_a = mock_name_a().id;
    let store_b = mock_name_store_b().id;

    // Units are packs × pack size, value is the lines' total before tax (OMS-REG-RPT-13.3, .4).
    // Cancelled and unpicked shipments and the inbound shipment are left out (.7, .8).
    assert_eq!(
        items_by_name(json!({})),
        vec![
            (item_a.clone(), name_a.clone(), 30.0, 32.0),
            (item_a.clone(), store_b.clone(), 30.0, 30.0),
            (item_b.clone(), name_a.clone(), 5.0, 7.5),
        ]
    );

    // Dates arrive from the front end as UTC instants, and are compared with the confirmed
    // (picked) date: name A's shipment on the 10th, store B's on the 20th (OMS-REG-RPT-13.8, .9)
    assert_eq!(
        items_by_name(json!({ "after": "2026-01-15T00:00:00.000Z" })),
        vec![(item_a.clone(), store_b.clone(), 30.0, 30.0)]
    );
    assert_eq!(
        items_by_name(json!({ "before": "2026-01-15T23:59:59.999Z" })),
        vec![
            (item_a.clone(), name_a.clone(), 30.0, 32.0),
            (item_b.clone(), name_a.clone(), 5.0, 7.5),
        ]
    );

    // Purchases from suppliers, confirmed when received (OMS-REG-RPT-13.7, .8)
    assert_eq!(
        items_by_name(json!({ "transactionType": "INBOUND_SHIPMENT" })),
        vec![(item_a.clone(), name_a.clone(), 10.0, 10.0)]
    );
}

#[actix_rt::test]
async fn lines_with_donor_lists_each_line_and_its_donor() {
    let (_, _, connection_manager, _) = setup_all_with_data(
        "lines_with_donor_lists_each_line_and_its_donor",
        MockDataInserts::none().names().stores().units().items(),
        mock_data(),
    )
    .await;
    let executor = ReportQueryExecutor::new(&connection_manager);
    let lines = |overrides| run(&executor, LINES_SQLITE, LINES_POSTGRES, overrides);

    let ids = |rows: Vec<Value>| -> Vec<String> {
        rows.iter()
            .map(|row| row["id"].as_str().unwrap().to_string())
            .collect()
    };

    // In date order, then by item: name A's lines were picked first (OMS-REG-RPT-13.10)
    let all = lines(json!({}));
    assert_eq!(ids(all.clone()), vec!["a1", "a2", "a3", "b1"]);

    // Each line's columns, and its donor (OMS-REG-RPT-13.11, .12)
    let donated = &all[0];
    assert_eq!(donated["donor_name"], json!(mock_name_b().name));
    assert_eq!(donated["name_name"], json!(mock_name_a().name));
    assert_eq!(donated["item_code"], json!(mock_item_a().code));
    assert_eq!(donated["quantity"].as_f64(), Some(20.0));
    assert_eq!(donated["value"].as_f64(), Some(20.0));
    // A UTC instant the template's date filter can put in the user's timezone
    assert_eq!(donated["confirmed_datetime"], json!("2026-01-10T10:00:00Z"));
    assert_eq!(all[1]["donor_name"], Value::Null);

    // The date range applies as it does in the crosstab
    assert_eq!(
        ids(lines(json!({ "after": "2026-01-15T00:00:00.000Z" }))),
        vec!["b1"]
    );
}
