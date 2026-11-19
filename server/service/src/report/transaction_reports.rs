//! The transaction reports (standard_reports/transaction-items-by-name and
//! standard_reports/transaction-lines-with-donor), run against mock data on whichever backend
//! the tests are built for. The SQL is read from the report folders, and the render test
//! installs the built standard reports, so these test what the reports ship.

use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    CategoryRow, CategoryRowRepository, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus,
    InvoiceType, MasterListLineRow, MasterListRow, ReportQueryExecutor, ReportSqlQuery,
    SqlParameters, StorageConnection,
    item_category_row::{ItemCategoryJoinRow, ItemCategoryJoinRowRepository},
    mock::{
        MockData, MockDataInserts, common::FullMockMasterList, mock_item_a, mock_item_b,
        mock_name_a, mock_name_b, mock_name_store_b, mock_store_a, mock_store_b,
    },
    test_db::setup_all_with_data,
};
use serde_json::{Value, json};

use crate::{
    report::report_service::{ResolvedReportQuery, generate_report},
    service_provider::ServiceProvider,
    standard_reports::StandardReports,
};

const ITEMS_BY_NAME_SQLITE: &str = include_str!(
    "../../../../standard_reports/transaction-items-by-name/latest/src/itemsByName.sqlite.sql"
);
const ITEMS_BY_NAME_POSTGRES: &str = include_str!(
    "../../../../standard_reports/transaction-items-by-name/latest/src/itemsByName.postgres.sql"
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
    // Picked in January, shipped in February, to a name that is not a store
    let to_name_a = InvoiceRow {
        picked_datetime: datetime(1, 10),
        shipped_datetime: datetime(2, 5),
        invoice_number: 1,
        ..outbound("to_name_a", &mock_name_a().id)
    };
    // A stock transfer: the other party is store B. Picked, not yet shipped.
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
    // Another transaction type, confirmed when received
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
        full_master_lists: vec![FullMockMasterList {
            master_list: MasterListRow {
                id: "only_item_b".to_string(),
                is_active: true,
                ..Default::default()
            },
            joins: vec![],
            lines: vec![MasterListLineRow {
                id: "only_item_b".to_string(),
                master_list_id: "only_item_b".to_string(),
                item_id: mock_item_b().id,
                ..Default::default()
            }],
        }],
        ..Default::default()
    }
}

/// Item B is in the "Analgesics" category
fn insert_categories(connection: &StorageConnection) {
    CategoryRowRepository::new(connection)
        .upsert_one(&CategoryRow {
            id: "analgesics".to_string(),
            name: "Analgesics".to_string(),
            ..Default::default()
        })
        .unwrap();
    ItemCategoryJoinRowRepository::new(connection)
        .upsert_one(&ItemCategoryJoinRow {
            id: "item_b_analgesics".to_string(),
            category_id: "analgesics".to_string(),
            item_id: mock_item_b().id,
            deleted_datetime: None,
        })
        .unwrap();
}

/// The arguments the front end sends when nothing is changed: each choice at its default and
/// each optional filter left empty, so sent as null.
fn arguments(overrides: Value) -> SqlParameters {
    let mut arguments = json!({
        "storeId": mock_store_a().id,
        "timezone": "UTC",
        "show": "QUANTITY",
        "transactionType": "OUTBOUND_SHIPMENT",
        "dateBasis": "CONFIRMED",
        "stockTransfers": "INCLUDE",
        "after": null,
        "before": null,
        "nameSearch": null,
        "donorSearch": null,
        "itemSearch": null,
        "itemCategory": null,
        "masterListId": null,
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
    let (_, connection, connection_manager, _) = setup_all_with_data(
        "items_by_name_totals_each_item_with_each_other_party",
        MockDataInserts::none().names().stores().units().items(),
        mock_data(),
    )
    .await;
    insert_categories(&connection);
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
    let name_a_item_a = (item_a.clone(), name_a.clone(), 30.0, 32.0);
    let store_b_item_a = (item_a.clone(), store_b.clone(), 30.0, 30.0);
    let name_a_item_b = (item_b.clone(), name_a.clone(), 5.0, 7.5);

    // Units are packs × pack size, value is the lines' total before tax (OMS-REG-RPT-13.3,
    // .4). Cancelled and unpicked shipments and the inbound shipment are left out (.8, .9).
    assert_eq!(
        items_by_name(json!({})),
        vec![
            name_a_item_a.clone(),
            store_b_item_a.clone(),
            name_a_item_b.clone()
        ]
    );

    // Stock transfers: only the shipment to store B is one (OMS-REG-RPT-13.12)
    assert_eq!(
        items_by_name(json!({ "stockTransfers": "EXCLUDE" })),
        vec![name_a_item_a.clone(), name_a_item_b.clone()]
    );
    assert_eq!(
        items_by_name(json!({ "stockTransfers": "ONLY" })),
        vec![store_b_item_a.clone()]
    );

    // Dates arrive from the front end as UTC instants. By confirmed (picked) date the
    // shipment to store B is the only one from the 15th; the 10th is before the cut-off
    // (OMS-REG-RPT-13.9, .11).
    assert_eq!(
        items_by_name(json!({ "after": "2026-01-15T00:00:00.000Z" })),
        vec![store_b_item_a.clone()]
    );
    assert_eq!(
        items_by_name(json!({ "before": "2026-01-15T23:59:59.999Z" })),
        vec![name_a_item_a.clone(), name_a_item_b.clone()]
    );

    // By shipped date only the shipment to name A counts: store B's hasn't shipped
    // (OMS-REG-RPT-13.10)
    assert_eq!(
        items_by_name(json!({ "dateBasis": "SHIPPED" })),
        vec![name_a_item_a.clone(), name_a_item_b.clone()]
    );

    // Purchases from suppliers are their own transaction type (OMS-REG-RPT-13.8)
    assert_eq!(
        items_by_name(json!({ "transactionType": "INBOUND_SHIPMENT" })),
        vec![(item_a.clone(), name_a.clone(), 10.0, 10.0)]
    );

    // Searches match code or name, ignoring case (OMS-REG-RPT-13.13)
    assert_eq!(
        items_by_name(json!({ "nameSearch": "store b" })),
        vec![store_b_item_a.clone()]
    );
    assert_eq!(
        items_by_name(json!({ "itemSearch": "ITEM B" })),
        vec![name_a_item_b.clone()]
    );
    // The donor filter counts only donated lines: a1 is 2 packs of item A, worth 20
    assert_eq!(
        items_by_name(json!({ "donorSearch": "name_b" })),
        vec![(item_a.clone(), name_a.clone(), 20.0, 20.0)]
    );

    // The item category and master list filters keep only their items (OMS-REG-RPT-13.14)
    assert_eq!(
        items_by_name(json!({ "itemCategory": "analgesic" })),
        vec![name_a_item_b.clone()]
    );
    assert_eq!(
        items_by_name(json!({ "masterListId": "only_item_b" })),
        vec![name_a_item_b.clone()]
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

    // In date order, then by item: name A's lines were picked first (OMS-REG-RPT-13.15)
    let all = lines(json!({}));
    assert_eq!(ids(all.clone()), vec!["a1", "a2", "a3", "b1"]);

    // Each line's columns, and its donor (OMS-REG-RPT-13.16, .17)
    let donated = &all[0];
    assert_eq!(donated["donor_name"], json!(mock_name_b().name));
    assert_eq!(donated["name_name"], json!(mock_name_a().name));
    assert_eq!(donated["item_code"], json!(mock_item_a().code));
    assert_eq!(donated["quantity"].as_f64(), Some(20.0));
    assert_eq!(donated["value"].as_f64(), Some(20.0));
    // A UTC instant the template's date filter can put in the user's timezone
    assert_eq!(
        donated["transaction_datetime"],
        json!("2026-01-10T10:00:00Z")
    );
    assert_eq!(all[1]["donor_name"], Value::Null);

    // The filters apply as they do in the crosstab
    assert_eq!(ids(lines(json!({ "donorSearch": "NAME_B" }))), vec!["a1"]);
    assert_eq!(ids(lines(json!({ "stockTransfers": "ONLY" }))), vec!["b1"]);
    assert_eq!(
        ids(lines(json!({ "after": "2026-01-15T00:00:00.000Z" }))),
        vec!["b1"]
    );
}

/// The installed crosstab, rendered as the server does: its query, its convert_data and its
/// template, for each Show option. Each table row is its cells' text joined with `|`.
#[actix_rt::test]
async fn items_by_name_renders_each_show_option() {
    let (_, connection, connection_manager, _) = setup_all_with_data(
        "items_by_name_renders_each_show_option",
        MockDataInserts::none().names().stores().units().items(),
        mock_data(),
    )
    .await;
    StandardReports::load_reports(&connection, false).unwrap();
    let service_provider = ServiceProvider::new(connection_manager.clone());
    let context = service_provider
        .context(mock_store_a().id, "".to_string())
        .unwrap();
    let localisations = service_provider
        .localisations_service
        .get_localisations(&connection)
        .unwrap();
    let report = service_provider
        .report_service
        .resolve_report(&context, "transaction-items-by-name_3_5_0_false")
        .unwrap();
    let queries = report
        .queries
        .iter()
        .filter_map(|query| match query {
            ResolvedReportQuery::SQLQuery(sql) => Some(ReportSqlQuery {
                name: sql.name.clone(),
                sqlite: sql.query_sqlite.clone(),
                postgres: sql.query_postgres.clone(),
            }),
            ResolvedReportQuery::GraphQlQuery(_) => None,
        })
        .collect::<Vec<_>>();
    let executor = ReportQueryExecutor::new(&connection_manager);

    let render = |show: &str| -> Vec<String> {
        let arguments = arguments(json!({ "show": show }));
        let data = executor
            .run(queries.clone(), &arguments)
            .unwrap()
            .into_iter()
            .map(|(name, rows)| (name, Value::Array(rows)))
            .collect::<serde_json::Map<_, _>>();
        let document = generate_report(
            &report,
            Value::Object(data),
            Some(Value::Object(arguments)),
            &localisations,
            Some("en".to_string()),
        )
        .unwrap()
        .document;
        let html = scraper::Html::parse_document(&document);
        let row = scraper::Selector::parse("tr").unwrap();
        let cell = scraper::Selector::parse("td").unwrap();
        html.select(&row)
            .map(|row| {
                row.select(&cell)
                    .map(|cell| cell.text().collect::<String>().trim().to_string())
                    .collect::<Vec<_>>()
                    .join("|")
            })
            .collect()
    };
    let item_a = format!("{}|{}|", mock_item_a().code, mock_item_a().name);
    let item_b = format!("{}|{}|", mock_item_b().code, mock_item_b().name);

    // Items in rows, names in columns sorted by name, then the item's total; a blank cell
    // where there was nothing; a Total row (OMS-REG-RPT-13.1, .2, .3, .5)
    assert_eq!(
        render("QUANTITY"),
        vec![
            "Item code|Item name|Unit|name_a|Store B|Total".to_string(),
            format!("{item_a}|30|30|60"),
            format!("{item_b}|5||5"),
            "Total|||35|30|65".to_string(),
        ]
    );

    // Values instead of units (OMS-REG-RPT-13.4)
    assert_eq!(
        render("VALUE"),
        vec![
            "Item code|Item name|Unit|name_a|Store B|Total".to_string(),
            format!("{item_a}|32|30|62"),
            format!("{item_b}|7.5||7.5"),
            "Total|||39.5|30|69.5".to_string(),
        ]
    );

    // Both: two columns per name, each heading carrying the name, as the Excel export keeps
    // only one heading row (OMS-REG-RPT-13.4)
    assert_eq!(
        render("BOTH")[0],
        "Item code|Item name|Unit|name_a (Quantity)|name_a (Value)|Store B (Quantity)|Store B (Value)|Total (Quantity)|Total (Value)"
    );
    assert_eq!(render("BOTH")[1], format!("{item_a}|30|32|30|30|60|62"));
}
