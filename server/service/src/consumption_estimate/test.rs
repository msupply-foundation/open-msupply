use chrono::{Duration, NaiveDate};
use repository::{
    ChangelogRepository, ConsumptionEstimateSource, ConsumptionFilter, ConsumptionRepository,
    EqualFilter, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, ItemRow,
    mock::{
        MockData, MockDataInserts, mock_item_a, mock_item_b, mock_item_c, mock_store_a,
        mock_user_account_a,
    },
    test_db::{setup_all, setup_all_with_data},
};
use util::date_now;

use super::*;
use crate::{item_stats::get_item_stats, service_provider::ServiceProvider};

fn date(y: i32, m: u32, d: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(y, m, d).unwrap()
}

fn line(item: &str, start: NaiveDate, end: NaiveDate, quantity: f64) -> ConsumptionEstimateInput {
    ConsumptionEstimateInput {
        item_id_or_code: item.to_string(),
        period_start: start,
        period_end: end,
        quantity,
    }
}

fn replace(lines: Vec<ConsumptionEstimateInput>, dry_run: bool) -> ReplaceConsumptionEstimates {
    ReplaceConsumptionEstimates {
        store_id: mock_store_a().id,
        source: ConsumptionEstimateSource::InitialUpload,
        lines,
        cleared_items: vec![],
        dry_run,
    }
}

#[test]
fn a_period_is_split_into_week_long_pieces_at_their_midpoints() {
    let estimate = ConsumptionEstimate {
        item_id: "item".to_string(),
        period_start: date(2026, 9, 1),
        period_end: date(2026, 9, 30),
        quantity: 300.0,
    };
    let pieces = split_into_pieces(
        "store",
        &ConsumptionEstimateSource::InitialUpload,
        &estimate,
    );

    // 7 + 7 + 7 + 7 + 2 days
    assert_eq!(
        pieces.iter().map(|p| p.date).collect::<Vec<_>>(),
        vec![
            date(2026, 9, 4),
            date(2026, 9, 11),
            date(2026, 9, 18),
            date(2026, 9, 25),
            date(2026, 9, 29),
        ]
    );
    assert_eq!(pieces[0].quantity, 70.0);
    assert_eq!(pieces[4].quantity, 20.0);
    assert_eq!(pieces.iter().map(|p| p.quantity).sum::<f64>(), 300.0);
    assert!(pieces.iter().all(|p| p.period_start == estimate.period_start
        && p.period_end == estimate.period_end));

    // A single day is one piece on that day
    let day = ConsumptionEstimate {
        period_end: date(2026, 9, 1),
        ..estimate
    };
    let pieces = split_into_pieces("store", &ConsumptionEstimateSource::InitialUpload, &day);
    assert_eq!(pieces.len(), 1);
    assert_eq!(pieces[0].date, date(2026, 9, 1));
    assert_eq!(pieces[0].quantity, 300.0);
}

#[actix_rt::test]
async fn replace_saves_replaces_and_clears() {
    let (_, connection, connection_manager, _) =
        setup_all("consumption_estimate_replace", MockDataInserts::all()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    let source = ConsumptionEstimateSource::InitialUpload;

    // By code or by id
    let lines = vec![
        line(
            &mock_item_a().code,
            date(2026, 8, 1),
            date(2026, 8, 31),
            310.0,
        ),
        line(
            &mock_item_a().id,
            date(2026, 9, 1),
            date(2026, 9, 30),
            300.0,
        ),
        line(
            &mock_item_b().code,
            date(2026, 9, 1),
            date(2026, 9, 30),
            30.0,
        ),
    ];

    // A dry run saves nothing
    let result = replace_consumption_estimates(&ctx, replace(lines.clone(), true)).unwrap();
    assert_eq!(result.estimates.len(), 3);
    assert_eq!(
        get_consumption_estimates(&connection, &mock_store_a().id, &source).unwrap(),
        vec![]
    );

    replace_consumption_estimates(&ctx, replace(lines, false)).unwrap();
    let saved = get_consumption_estimates(&connection, &mock_store_a().id, &source).unwrap();
    assert_eq!(
        saved,
        vec![
            ConsumptionEstimate {
                item_id: mock_item_a().id,
                period_start: date(2026, 8, 1),
                period_end: date(2026, 8, 31),
                quantity: 310.0,
            },
            ConsumptionEstimate {
                item_id: mock_item_a().id,
                period_start: date(2026, 9, 1),
                period_end: date(2026, 9, 30),
                quantity: 300.0,
            },
            ConsumptionEstimate {
                item_id: mock_item_b().id,
                period_start: date(2026, 9, 1),
                period_end: date(2026, 9, 30),
                quantity: 30.0,
            },
        ]
    );

    // Uploading again replaces the estimates of the items it names: item_b now
    // has only July, and item_a, not named, is left alone
    let changelog_before = estimate_changelog_count(&connection);
    let lines = vec![line(
        &mock_item_b().code,
        date(2026, 7, 1),
        date(2026, 7, 31),
        62.0,
    )];
    replace_consumption_estimates(&ctx, replace(lines.clone(), false)).unwrap();
    assert_eq!(
        get_consumption_estimates(&connection, &mock_store_a().id, &source).unwrap(),
        vec![
            ConsumptionEstimate {
                item_id: mock_item_a().id,
                period_start: date(2026, 8, 1),
                period_end: date(2026, 8, 31),
                quantity: 310.0,
            },
            ConsumptionEstimate {
                item_id: mock_item_a().id,
                period_start: date(2026, 9, 1),
                period_end: date(2026, 9, 30),
                quantity: 300.0,
            },
            ConsumptionEstimate {
                item_id: mock_item_b().id,
                period_start: date(2026, 7, 1),
                period_end: date(2026, 7, 31),
                quantity: 62.0,
            },
        ]
    );
    // September's 5 pieces deleted and July's 5 inserted; item_a untouched
    assert_eq!(estimate_changelog_count(&connection) - changelog_before, 10);

    // The same file again writes nothing
    let changelog_before = estimate_changelog_count(&connection);
    replace_consumption_estimates(&ctx, replace(lines, false)).unwrap();
    assert_eq!(estimate_changelog_count(&connection), changelog_before);

    // Clearing removes them all
    clear_consumption_estimates(&ctx, &mock_store_a().id, &source).unwrap();
    assert_eq!(
        get_consumption_estimates(&connection, &mock_store_a().id, &source).unwrap(),
        vec![]
    );
}

/// Every changelog entry moves the cursor on by one, and nothing else writes
/// to the changelog in these tests
fn estimate_changelog_count(connection: &StorageConnection) -> u64 {
    ChangelogRepository::new(connection).max_cursor().unwrap()
}

/// The pieces of a period add back up to what was entered, not to within
/// floating point error of it
#[actix_rt::test]
async fn quantities_read_back_as_entered() {
    let (_, connection, connection_manager, _) =
        setup_all("consumption_estimate_rounding", MockDataInserts::all()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    let lines = vec![line(
        &mock_item_a().code,
        date(2026, 10, 1),
        date(2026, 10, 31),
        872.58,
    )];
    replace_consumption_estimates(&ctx, replace(lines, false)).unwrap();
    let saved = get_consumption_estimates(
        &connection,
        &mock_store_a().id,
        &ConsumptionEstimateSource::InitialUpload,
    )
    .unwrap();
    assert_eq!(saved[0].quantity, 872.58);
}

#[actix_rt::test]
async fn replace_rejects_bad_lines_and_saves_nothing() {
    let (_, connection, connection_manager, _) =
        setup_all("consumption_estimate_bad_lines", MockDataInserts::all()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    let item = mock_item_a().code;
    let today = date_now();

    let lines = vec![
        line(&item, date(2026, 1, 1), date(2026, 1, 31), 10.0),
        line("no_such_item", date(2026, 1, 1), date(2026, 1, 31), 10.0),
        line(&item, date(2026, 3, 31), date(2026, 3, 1), 10.0),
        line(&item, today, today + Duration::days(1), 10.0),
        line(&item, date(2026, 4, 1), date(2026, 4, 30), -1.0),
        line(&item, date(2026, 1, 31), date(2026, 2, 27), 10.0),
        // Plenty of items have no code: a blank one mustn't match them
        line(" ", date(2026, 5, 1), date(2026, 5, 31), 10.0),
    ];
    assert_eq!(
        replace_consumption_estimates(&ctx, replace(lines, false)),
        Err(ReplaceConsumptionEstimatesError::InvalidLines(vec![
            LineError {
                line: 1,
                problem: LineProblem::ItemNotFound
            },
            LineError {
                line: 2,
                problem: LineProblem::InvalidPeriod
            },
            LineError {
                line: 3,
                problem: LineProblem::PeriodInFuture
            },
            LineError {
                line: 4,
                problem: LineProblem::InvalidQuantity
            },
            LineError {
                line: 5,
                problem: LineProblem::OverlapsLine(0)
            },
            LineError {
                line: 6,
                problem: LineProblem::ItemNotFound
            },
        ]))
    );
    assert_eq!(
        get_consumption_estimates(
            &connection,
            &mock_store_a().id,
            &ConsumptionEstimateSource::InitialUpload
        )
        .unwrap(),
        vec![]
    );

    let mut input = replace(vec![], false);
    input.store_id = "no_such_store".to_string();
    assert_eq!(
        replace_consumption_estimates(&ctx, input),
        Err(ReplaceConsumptionEstimatesError::StoreDoesNotExist)
    );
}

/// Estimates are consumption to everything reading the `consumption` view, AMC
/// included, on top of what the store recorded itself.
#[actix_rt::test]
async fn estimates_add_to_consumption_and_amc() {
    let (_, connection, connection_manager, _) =
        setup_all("consumption_estimate_amc", MockDataInserts::all()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    let store_id = mock_store_a().id;
    let item_id = mock_item_a().id;
    let amc = || {
        get_item_stats(
            &connection,
            &store_id,
            Some(3.0),
            vec![item_id.clone()],
            None,
        )
        .unwrap()
        .pop()
        .map(|stats| stats.average_monthly_consumption)
        .unwrap_or(0.0)
    };
    let before = amc();

    // Four weeks ending yesterday: inside a 3 month window
    let yesterday = date_now() - Duration::days(1);
    let lines = vec![line(
        &item_id,
        yesterday - Duration::days(27),
        yesterday,
        280.0,
    )];
    replace_consumption_estimates(&ctx, replace(lines, false)).unwrap();

    let estimated: Vec<_> = ConsumptionRepository::new(&connection)
        .query(Some(
            ConsumptionFilter::new()
                .store_id(EqualFilter::equal_to(store_id.clone()))
                .item_id(EqualFilter::equal_to(item_id.clone())),
        ))
        .unwrap()
        .into_iter()
        .filter(|row| row.is_estimate)
        .collect();
    assert_eq!(estimated.len(), 4);
    assert_eq!(estimated.iter().map(|row| row.quantity).sum::<f64>(), 280.0);

    assert!((amc() - before - 280.0 / 3.0).abs() < 1e-9);

    // ...and not to what the store recorded itself
    assert!(
        ConsumptionRepository::new(&connection)
            .query_actual(Some(
                ConsumptionFilter::new().store_id(EqualFilter::equal_to(store_id.clone()))
            ))
            .unwrap()
            .iter()
            .all(|row| !row.is_estimate)
    );
}

/// A period that already has real consumption is saved, with a warning
#[actix_rt::test]
async fn overlap_with_actual_consumption_is_reported() {
    let issued = date_now() - Duration::days(10);
    let (_, _, connection_manager, _) = setup_all_with_data(
        "consumption_estimate_overlap",
        MockDataInserts::all(),
        MockData {
            invoices: vec![InvoiceRow {
                id: "estimate_overlap_shipment".to_string(),
                name_id: "name_store_c".to_string(),
                store_id: mock_store_a().id,
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::Picked,
                picked_datetime: Some(issued.and_hms_opt(12, 0, 0).unwrap()),
                created_datetime: issued.and_hms_opt(10, 0, 0).unwrap(),
                ..Default::default()
            }],
            invoice_lines: vec![InvoiceLineRow {
                id: "estimate_overlap_line".to_string(),
                invoice_id: "estimate_overlap_shipment".to_string(),
                item_id: mock_item_b().id,
                r#type: InvoiceLineType::StockOut,
                number_of_packs: 4.0,
                pack_size: 10.0,
                ..Default::default()
            }],
            ..Default::default()
        },
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();

    let lines = vec![
        // Before the shipment
        line(
            &mock_item_b().code,
            issued - Duration::days(40),
            issued - Duration::days(11),
            5.0,
        ),
        // Covers it
        line(
            &mock_item_b().code,
            issued - Duration::days(10),
            issued,
            5.0,
        ),
    ];
    let result = replace_consumption_estimates(&ctx, replace(lines, true)).unwrap();
    assert_eq!(
        result.overlaps,
        vec![ActualConsumptionOverlap {
            line: 1,
            actual_quantity: 40.0
        }]
    );
}

#[actix_rt::test]
async fn a_code_that_lost_its_leading_zeros_still_matches() {
    let item_with_zeros = ItemRow {
        id: "item_with_zeros".to_string(),
        code: "030063".to_string(),
        ..Default::default()
    };
    // These two both read as 77 without their zeros, so neither is picked
    let ambiguous_a = ItemRow {
        id: "ambiguous_a".to_string(),
        code: "077".to_string(),
        ..Default::default()
    };
    let ambiguous_b = ItemRow {
        id: "ambiguous_b".to_string(),
        code: "0077".to_string(),
        ..Default::default()
    };
    let (_, connection, _, _) = setup_all_with_data(
        "a_code_that_lost_its_leading_zeros_still_matches",
        MockDataInserts::none().stores().items(),
        MockData {
            items: vec![item_with_zeros, ambiguous_a, ambiguous_b],
            ..Default::default()
        },
    )
    .await;

    let found = find_item_ids(&connection, ["30063", "030063", "77", "0077"].into_iter()).unwrap();
    assert_eq!(
        found.get("30063").map(String::as_str),
        Some("item_with_zeros")
    );
    assert_eq!(
        found.get("030063").map(String::as_str),
        Some("item_with_zeros")
    );
    assert_eq!(found.get("77"), None);
    // Written exactly, an ambiguous code is still found
    assert_eq!(found.get("0077").map(String::as_str), Some("ambiguous_b"));
}

#[actix_rt::test]
async fn an_item_named_with_no_periods_loses_its_estimates() {
    let (_, connection, connection_manager, _) =
        setup_all("consumption_estimate_cleared_items", MockDataInserts::all()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    let source = ConsumptionEstimateSource::InitialUpload;
    let september = (date(2026, 9, 1), date(2026, 9, 30));

    replace_consumption_estimates(
        &ctx,
        replace(
            vec![
                line(&mock_item_a().code, september.0, september.1, 30.0),
                line(&mock_item_b().code, september.0, september.1, 20.0),
            ],
            false,
        ),
    )
    .unwrap();

    // Item a is cleared; the others named have nothing to remove; item b,
    // cleared but also given a line, keeps the line
    let mut input = replace(
        vec![line(&mock_item_b().code, september.0, september.1, 25.0)],
        true,
    );
    input.cleared_items = vec![
        "no_such_item".to_string(),
        mock_item_a().code,
        mock_item_c().code,
        mock_item_b().code,
    ];
    let result = replace_consumption_estimates(&ctx, input.clone()).unwrap();
    assert_eq!(result.removed, vec![1]);
    // A dry run removes nothing
    assert_eq!(
        get_consumption_estimates(&connection, &mock_store_a().id, &source)
            .unwrap()
            .len(),
        2
    );

    input.dry_run = false;
    replace_consumption_estimates(&ctx, input).unwrap();
    assert_eq!(
        get_consumption_estimates(&connection, &mock_store_a().id, &source).unwrap(),
        vec![ConsumptionEstimate {
            item_id: mock_item_b().id,
            period_start: september.0,
            period_end: september.1,
            quantity: 25.0,
        }]
    );
}
