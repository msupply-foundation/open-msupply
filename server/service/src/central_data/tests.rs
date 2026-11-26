use super::{
    CentralDataService, CentralDataServiceTrait, CentralDataTable, Change, ExportCount,
    ExportError, ExportFilter, ExportTable, FieldChange, ImportError, MAX_IMPORT_ROWS,
    MAX_ROWS_LISTED, OpenSessions, RecordCount, RowChange, TableChanges,
    cells::RowError,
    sheet::{self, SheetData, Value},
};
use crate::{
    currency::home_currencies,
    service_provider::{ServiceContext, ServiceProvider},
    session_store::SessionStore,
    user_account::UserAccountService,
};
use chrono::NaiveDate;
use repository::{
    ContextRow, ContextRowRepository, PermissionType, UserPermissionRow,
    UserPermissionRowRepository,
};
use repository::{
    CurrencyRow, CurrencyRowRepository, EqualFilter, InvoiceRow, InvoiceRowRepository, ItemRow,
    ItemRowRepository, ItemType, ItemVariantRow, ItemVariantRowRepository, KeyType,
    KeyValueStoreRepository, LanguageType, LocationTypeRow, LocationTypeRowRepository,
    MasterListRow, MasterListRowRepository, NameRow, NameRowRepository, NameRowType,
    NameStoreJoinFilter, NameStoreJoinRepository, NameStoreJoinRow, RequisitionLineRow,
    RequisitionLineRowRepository, SiteRow, SiteRowRepository, StorageConnection, StoreMode,
    StoreRow, StoreRowRepository, UnitRow, UnitRowRepository, UserAccountRow,
    UserAccountRowRepository, UserStoreJoinRow, UserStoreJoinRowRepository, VENCategory,
    mock::{
        MockDataInserts, mock_draft_request_requisition_line, mock_item_a_variant_1,
        mock_outbound_shipment_a, mock_store_a,
    },
    test_db::setup_all,
};
use repository::{
    ItemLinkRow, ItemLinkRowRepository, MasterListLineFilter, MasterListLineRepository,
    MasterListLineRow, MasterListLineRowRepository, MasterListNameJoinFilter,
    MasterListNameJoinRepository, MasterListNameJoinRow, NameLinkRow, NameLinkRowRepository,
};
use repository::{
    ItemStoreJoinFilter, ItemStoreJoinRow, ItemStoreJoinRowRepository,
    ItemStoreJoinRowRepositoryTrait, LocationRow, LocationRowRepository,
};
use std::{
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
};
use tempfile::TempDir;
use util::constants::{MISSING_PROGRAM, PLUGIN_USER_ID, SYSTEM_USER_ID};

fn mock_unit(connection: &StorageConnection) -> UnitRow {
    UnitRowRepository::new(connection)
        .find_one_by_id("item_query_test2")
        .unwrap()
        .unwrap()
}

fn units_named(connection: &StorageConnection, name: &str) -> Vec<UnitRow> {
    UnitRowRepository::new(connection)
        .find_all()
        .unwrap()
        .into_iter()
        .filter(|unit| unit.name == name)
        .collect()
}

/// For an import whose users' sessions don't matter to the test.
fn ending_sessions(summary: &super::ImportSummary) -> Vec<&str> {
    summary
        .sessions_to_end
        .iter()
        .map(|end| end.user_id.as_str())
        .collect()
}

fn no_sessions() -> OpenSessions {
    OpenSessions {
        store: Default::default(),
        keep: None,
    }
}

/// The importing user's date, pinned so a run across midnight can't change it.
fn today() -> NaiveDate {
    NaiveDate::from_ymd_opt(2026, 11, 18).unwrap()
}

fn write_file(dir: &Path, bytes: Vec<u8>) -> PathBuf {
    let path = dir.join("import.xlsx");
    std::fs::write(&path, bytes).unwrap();
    path
}

fn sheet_data(name: &str, headers: &[&str], rows: Vec<Vec<Value>>) -> SheetData {
    SheetData {
        name: name.to_string(),
        header_row: 1,
        first_column: 1,
        headers: headers.iter().map(|header| header.to_string()).collect(),
        text_columns: vec![],
        rows,
    }
}

fn unit_sheet(headers: Vec<&'static str>, rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![sheet_data("unit", &headers, rows)]).unwrap()
}

fn all_units() -> ExportTable {
    ExportTable {
        table: CentralDataTable::Unit,
        filter: ExportFilter::default(),
    }
}

fn unit_changes(inserted: u32, updated: u32, unchanged: u32) -> Vec<TableChanges> {
    vec![TableChanges {
        table: CentralDataTable::Unit,
        inserted,
        updated,
        deleted: 0,
        unchanged,
        error_count: 0,
    }]
}

// covers: OMS-REG-CDIO-01.1, .2, .10, .11, .22, .65

#[actix_rt::test]
async fn export_then_import_makes_no_changes() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_export_then_import",
        MockDataInserts::none().units(),
    )
    .await;
    // Leading zeros, no description and inactive must survive the round trip.
    UnitRowRepository::new(&connection)
        .upsert_one(&UnitRow {
            id: "unit_007".to_string(),
            name: "007".to_string(),
            description: None,
            index: 2,
            is_active: false,
        })
        .unwrap();
    // And spaces around a value, as legacy sync stores them.
    UnitRowRepository::new(&connection)
        .upsert_one(&UnitRow {
            id: "unit_padded".to_string(),
            name: "Tab ".to_string(),
            description: Some(" ".to_string()),
            index: 3,
            is_active: true,
        })
        .unwrap();
    let before = UnitRowRepository::new(&connection).find_all().unwrap();

    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let bytes = CentralDataService.export(&ctx, &[all_units()]).unwrap();
    let path = write_file(dir.path(), bytes);

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(0, 0, 3));
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        UnitRowRepository::new(&connection).find_all().unwrap(),
        before
    );
}

// covers: OMS-REG-CDIO-01.8

#[actix_rt::test]
async fn a_file_that_is_not_a_workbook_is_refused_with_the_readers_reason() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_not_a_workbook",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let before = UnitRowRepository::new(&connection).find_all().unwrap();
    // A CSV saved with the workbook's extension.
    let path = write_file(dir.path(), b"name,index,is_active\nTab,1,TRUE\n".to_vec());

    let refused = |result: Result<(), ImportError>| match result {
        Err(ImportError::CannotReadFile(reason)) => assert!(!reason.is_empty()),
        other => panic!("expected CannotReadFile, got {other:?}"),
    };
    refused(CentralDataService.preview_import(&ctx, &path).map(|_| ()));
    refused(
        CentralDataService
            .import(&ctx, &path, &no_sessions(), today())
            .map(|_| ()),
    );
    refused(
        CentralDataService
            .import_errors_file(&ctx, &path)
            .map(|_| ()),
    );
    assert_eq!(
        UnitRowRepository::new(&connection).find_all().unwrap(),
        before
    );
}

// covers: OMS-REG-CDIO-01.44

#[actix_rt::test]
async fn heading_errors_are_listed_before_row_errors() {
    let (_, _, connection_manager, _) =
        setup_all("central_data_heading_errors_first", MockDataInserts::none()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let rows = (0..MAX_ROWS_LISTED + 50)
        .map(|n| {
            vec![
                Value::Text(format!("Unit {n}")),
                Value::Text("x".to_string()),
                true.into(),
                Value::Empty,
            ]
        })
        .collect();
    let path = write_file(
        dir.path(),
        unit_sheet(vec!["name", "index", "is_active", "nmae"], rows),
    );

    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(summary.error_count as usize, MAX_ROWS_LISTED + 51);
    assert_eq!(
        (summary.errors[0].row, summary.errors[0].column.as_deref()),
        (Some(1), Some("nmae"))
    );
}

// covers: OMS-REG-CDIO-01.42, .43, .57

#[actix_rt::test]
async fn an_errors_file_keeps_every_row_in_place_and_imports_once_fixed() {
    let (_, connection, connection_manager, _) =
        setup_all("central_data_errors_file", MockDataInserts::none()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let text = |value: &str| Value::Text(value.to_string());

    let bytes = sheet::write(vec![
        sheet_data(
            "unit",
            &["name", "index", "is_active"],
            vec![
                vec![text("Box"), 1.into(), true.into()],
                vec![Value::Empty, Value::Empty, Value::Empty],
                vec![text("007"), text("abc"), true.into()],
                vec![text("Jar"), 2.into(), text("yes")],
            ],
        ),
        sheet_data("notes", &["x"], vec![vec![text("a note")]]),
    ])
    .unwrap();
    let path = write_file(dir.path(), bytes);

    let errors_path = dir.path().join("errors.xlsx");
    std::fs::write(
        &errors_path,
        CentralDataService.import_errors_file(&ctx, &path).unwrap(),
    )
    .unwrap();
    let sheets = sheet::read(&errors_path, MAX_IMPORT_ROWS).ok().unwrap();
    let unit = &sheets[0];
    assert_eq!(unit.headers, vec!["name", "index", "is_active", "error"]);
    let rows: Vec<(u32, Vec<&str>)> = unit
        .rows
        .iter()
        .map(|row| (row.number, row.cells.iter().map(String::as_str).collect()))
        .collect();
    // Rows keep their numbers; wrong values stay as typed.
    assert_eq!(
        rows,
        vec![
            (2, vec!["Box", "1", "true", ""]),
            (
                4,
                vec![
                    "007",
                    "abc",
                    "true",
                    "index: \"abc\" must be a whole number"
                ]
            ),
            (
                5,
                vec![
                    "Jar",
                    "2",
                    "yes",
                    "is_active: \"yes\" must be TRUE, FALSE, 1 or 0"
                ]
            ),
        ]
    );
    assert_eq!(
        (sheets[1].name.as_str(), &sheets[1].headers),
        ("notes", &vec!["x".to_string()])
    );
    assert_eq!(sheets[1].rows[0].cells, vec!["a note"]);

    // Fixed, with the error column still filled in.
    let fixed = sheet::write(vec![sheet_data(
        "unit",
        &["name", "index", "is_active", "error"],
        vec![
            vec![text("Box"), 1.into(), true.into(), Value::Empty],
            vec![text("007"), 3.into(), true.into(), text("index: was wrong")],
            vec![
                text("Jar"),
                2.into(),
                true.into(),
                text("is_active: was wrong"),
            ],
        ],
    )])
    .unwrap();
    let summary = CentralDataService
        .import(
            &ctx,
            &write_file(dir.path(), fixed),
            &no_sessions(),
            today(),
        )
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(3, 0, 0));
    assert_eq!(
        UnitRowRepository::new(&connection)
            .find_all()
            .unwrap()
            .len(),
        3
    );
}

// covers: OMS-REG-CDIO-01.46, .47

#[actix_rt::test]
async fn an_export_holds_only_the_units_its_filter_matches() {
    let (_, connection, connection_manager, _) =
        setup_all("central_data_export_filter", MockDataInserts::none()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let repo = UnitRowRepository::new(&connection);
    for (id, name, is_active) in [
        ("tab", "Tablet", true),
        ("old_tab", "Old tablet", false),
        ("vial", "Vial", true),
    ] {
        repo.upsert_one(&UnitRow {
            id: id.to_string(),
            name: name.to_string(),
            description: None,
            index: 1,
            is_active,
        })
        .unwrap();
    }
    let units = |contains: Option<&str>, is_active| ExportTable {
        table: CentralDataTable::Unit,
        filter: ExportFilter {
            contains: contains.map(str::to_string),
            is_active,
        },
    };
    let exported_names = |table: ExportTable| {
        let path = dir.path().join("export.xlsx");
        std::fs::write(&path, CentralDataService.export(&ctx, &[table]).unwrap()).unwrap();
        let sheets = sheet::read(&path, MAX_IMPORT_ROWS).ok().unwrap();
        sheets[0]
            .rows
            .iter()
            .map(|row| row.cells[1].clone())
            .collect::<Vec<_>>()
    };

    // In export order: index, then name.
    assert_eq!(
        exported_names(units(Some("  TAB "), None)),
        vec!["Old tablet", "Tablet"]
    );
    assert_eq!(
        exported_names(units(Some("tab"), Some(true))),
        vec!["Tablet"]
    );
    assert_eq!(exported_names(units(None, Some(false))), vec!["Old tablet"]);
    assert_eq!(
        CentralDataService
            .export_counts(&ctx, &[units(Some("tab"), Some(true))])
            .unwrap(),
        vec![ExportCount {
            table: CentralDataTable::Unit,
            count: RecordCount {
                matching: 1,
                total: 3,
            },
        }]
    );
}

// covers: OMS-REG-CDIO-01.48

#[actix_rt::test]
async fn an_export_larger_than_an_import_allows_is_refused() {
    let (_, connection, _, _) =
        setup_all("central_data_export_too_many_rows", MockDataInserts::none()).await;
    let repo = UnitRowRepository::new(&connection);
    for n in 0..3 {
        repo.upsert_one(&UnitRow {
            id: format!("unit_{n}"),
            name: format!("Unit {n}"),
            description: None,
            index: 1,
            is_active: true,
        })
        .unwrap();
    }

    // A cap of 2 keeps the test small.
    assert!(matches!(
        super::export(&connection, &[all_units()], 2),
        Err(ExportError::TooManyRows { row_count: 3 })
    ));
    assert!(super::export(&connection, &[all_units()], 3).is_ok());
}

// covers: OMS-REG-CDIO-01.12, .13, .14, .15, .17, .28, .31, .35

#[actix_rt::test]
async fn one_bad_row_means_nothing_is_applied() {
    let (_, connection, connection_manager, _) =
        setup_all("central_data_one_bad_row", MockDataInserts::none().units()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let existing = mock_unit(&connection);

    let headers = vec!["id", "name", "index", "is_active"];
    let good_rows = || {
        vec![
            vec![
                Value::Empty,
                "Vial".to_string().into(),
                3.into(),
                true.into(),
            ],
            vec![
                existing.id.clone().into(),
                "Tablet".to_string().into(),
                Value::Empty,
                Value::Empty,
            ],
        ]
    };
    let mut rows = good_rows();
    rows.push(vec![
        Value::Empty,
        "Ampoule".to_string().into(),
        "abc".to_string().into(),
        true.into(),
    ]);
    let path = write_file(dir.path(), unit_sheet(headers.clone(), rows));

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.row, e.column.as_deref(), e.message.as_str()))
        .collect();
    assert_eq!(
        errors,
        vec![(Some(4), Some("index"), "\"abc\" must be a whole number")]
    );

    let repo = UnitRowRepository::new(&connection);
    assert_eq!(units_named(&connection, "Vial"), vec![]);
    assert_eq!(
        repo.find_one_by_id(&existing.id).unwrap(),
        Some(existing.clone())
    );

    let path = write_file(dir.path(), unit_sheet(headers, good_rows()));
    let preview = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(preview.errors, vec![]);
    assert_eq!(preview.tables, unit_changes(1, 1, 0));
    assert_eq!(
        preview.changes,
        vec![
            RowChange {
                sheet: "unit".to_string(),
                row: 2,
                record: "Vial".to_string(),
                change: Change::Inserted,
                fields: vec![],
            },
            RowChange {
                sheet: "unit".to_string(),
                row: 3,
                record: "Tablet".to_string(),
                change: Change::Updated,
                fields: vec![FieldChange {
                    column: "name",
                    from: existing.name.clone(),
                    to: "Tablet".to_string(),
                }],
            },
        ]
    );
    assert_eq!(units_named(&connection, "Vial"), vec![]);

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.tables, unit_changes(1, 1, 0));
    assert_eq!(units_named(&connection, "Vial").len(), 1);
    assert_eq!(
        repo.find_one_by_id(&existing.id).unwrap().unwrap().name,
        "Tablet"
    );
}

// covers: OMS-REG-CDIO-01.19, .20, .21

#[actix_rt::test]
async fn misspelt_columns_unknown_sheets_and_repeated_records_are_errors() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_header_errors",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let existing = mock_unit(&connection);

    let bytes = sheet::write(vec![
        sheet_data(
            "unit",
            &["id", "nmae", "index"],
            vec![
                vec![existing.id.clone().into(), "x".to_string().into(), 5.into()],
                vec![existing.id.clone().into(), Value::Empty, 6.into()],
            ],
        ),
        sheet_data("units", &["name"], vec![vec!["Vial".to_string().into()]]),
    ])
    .unwrap();
    let path = write_file(dir.path(), bytes);

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.sheet.as_str(), e.row, e.column.as_deref()))
        .collect();
    assert_eq!(
        errors,
        vec![
            ("units", None, None),
            ("unit", Some(1), Some("nmae")),
            ("unit", Some(3), None),
        ]
    );
    assert_eq!(
        summary.errors[2].message,
        "Row 2 already changes this record"
    );
    assert_eq!(
        UnitRowRepository::new(&connection)
            .find_one_by_id(&existing.id)
            .unwrap(),
        Some(existing)
    );
}

// covers: OMS-REG-CDIO-01.106

#[actix_rt::test]
async fn a_sheet_with_nothing_in_it_is_ignored() {
    let (_, _, connection_manager, _) =
        setup_all("central_data_empty_sheets", MockDataInserts::none()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();

    let bytes = sheet::write(vec![
        sheet_data(
            "unit",
            &["name", "index", "is_active"],
            vec![vec!["Vial".to_string().into(), 7.into(), true.into()]],
        ),
        sheet_data("Sheet2", &[], vec![]),
        // Only spaces, under any name, a table's too.
        sheet_data("Sheet3", &["   "], vec![]),
        sheet_data("location_type", &["", "  "], vec![]),
    ])
    .unwrap();
    let path = write_file(dir.path(), bytes);

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(1, 0, 0));
}

// covers: OMS-REG-CDIO-01.59, .60

#[actix_rt::test]
async fn a_repeated_heading_and_values_without_a_heading_are_errors() {
    let (_, _, connection_manager, _) =
        setup_all("central_data_heading_shape", MockDataInserts::none()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let text = |value: &str| Value::Text(value.to_string());

    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["name", "index", "is_active", "NAME", ""],
            vec![vec![
                text("Box"),
                1.into(),
                true.into(),
                text("Jar"),
                text("x"),
            ]],
        ),
    );

    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.row, e.column.as_deref(), e.message.as_str()))
        .collect();
    assert_eq!(
        errors,
        vec![
            (Some(1), Some("name"), "This column appears twice"),
            (Some(1), None, "Column E has values but no heading"),
        ]
    );
}

// covers: OMS-REG-CDIO-01.62

#[actix_rt::test]
async fn an_import_checks_the_file_again_after_its_preview() {
    let (_, connection, connection_manager, _) =
        setup_all("central_data_import_checks_again", MockDataInserts::none()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let repo = UnitRowRepository::new(&connection);
    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["name", "index", "is_active"],
            vec![vec!["Box".to_string().into(), 1.into(), true.into()]],
        ),
    );

    let preview = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(preview.error_count, 0);
    assert_eq!(preview.tables, unit_changes(1, 0, 0));

    // Saved after the preview, so the row now updates it.
    let saved = UnitRow {
        id: "box".to_string(),
        name: "Box".to_string(),
        description: None,
        index: 5,
        is_active: true,
    };
    repo.upsert_one(&saved).unwrap();

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.tables, unit_changes(0, 1, 0));
    assert_eq!(repo.find_all().unwrap().len(), 1);
    assert_eq!(repo.find_one_by_id("box").unwrap().unwrap().index, 1);
}

// covers: OMS-REG-CDIO-01.63, .58

#[actix_rt::test]
async fn on_an_update_a_blank_required_cell_keeps_and_a_blank_optional_cell_clears() {
    let (_, connection, connection_manager, _) =
        setup_all("central_data_blank_cells", MockDataInserts::none()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let repo = UnitRowRepository::new(&connection);
    repo.upsert_one(&UnitRow {
        id: "jar".to_string(),
        name: "Jar".to_string(),
        description: Some("Glass".to_string()),
        index: 4,
        is_active: true,
    })
    .unwrap();

    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["id", "name", "description", "index", "is_active"],
            vec![vec![
                "jar".to_string().into(),
                Value::Empty,
                Value::Empty,
                Value::Empty,
                Value::Empty,
            ]],
        ),
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        repo.find_one_by_id("jar").unwrap(),
        Some(UnitRow {
            id: "jar".to_string(),
            name: "Jar".to_string(),
            description: None,
            index: 4,
            is_active: true,
        })
    );
}

// covers: OMS-REG-CDIO-01.54

#[actix_rt::test]
async fn a_repeated_row_that_changes_nothing_is_not_an_error() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_repeated_unchanged_row",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let existing = mock_unit(&connection);

    // The last row repeats what the change before it wrote.
    let row = |index: i32| vec![existing.id.clone().into(), index.into()];
    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["id", "index"],
            vec![
                row(existing.index),
                row(existing.index),
                row(existing.index + 1),
                row(existing.index + 1),
            ],
        ),
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(0, 1, 3));
}

// covers: OMS-REG-CDIO-01.73

#[actix_rt::test]
async fn a_name_finds_a_unit_an_earlier_row_adds() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_unit_added_earlier_in_file",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();

    let row =
        |id: Value, index: i32| vec![id, "Vial".to_string().into(), index.into(), true.into()];
    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["id", "name", "index", "is_active"],
            vec![
                row(Value::Empty, 1),
                // Finds row 2's unit and repeats it.
                row(Value::Empty, 1),
                // Finds row 2's unit and changes it.
                row(Value::Empty, 2),
                // A second active Vial.
                row("new_vial".to_string().into(), 1),
            ],
        ),
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.row, e.message.as_str()))
        .collect();
    assert_eq!(errors[0], (Some(4), "Row 2 already changes this record"));
    assert_eq!(errors[1].0, Some(5));
    assert!(errors[1].1.ends_with(
        "is already named Vial. Give this unit another name, or make one of them inactive"
    ));
    assert_eq!(errors.len(), 2);
    assert_eq!(units_named(&connection, "Vial"), vec![]);
}

// covers: OMS-REG-CDIO-01.41

#[actix_rt::test]
async fn a_unit_row_cannot_give_an_active_unit_another_active_units_name() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_unit_duplicate_name",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let existing = mock_unit(&connection);

    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["id", "name", "index", "is_active"],
            vec![vec![
                "new_unit".to_string().into(),
                existing.name.clone().into(),
                1.into(),
                true.into(),
            ]],
        ),
    );

    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    let error = &summary.errors[0];
    assert_eq!(
        (error.row, error.column.as_deref()),
        (Some(2), Some("name"))
    );
    assert_eq!(
        error.message,
        format!(
            "Unit {} is already named {}. Give this unit another name, or make one of them inactive",
            existing.id, existing.name
        )
    );
}

#[actix_rt::test]
async fn later_rows_see_a_rename_made_earlier_in_the_file() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_unit_rename_in_file",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let repo = UnitRowRepository::new(&connection);
    let existing = mock_unit(&connection);

    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["id", "name", "index", "is_active"],
            vec![
                vec![
                    existing.id.clone().into(),
                    "Renamed".to_string().into(),
                    existing.index.into(),
                    true.into(),
                ],
                vec![
                    Value::Empty,
                    existing.name.clone().into(),
                    9.into(),
                    true.into(),
                ],
                // Finds the renamed unit, unchanged.
                vec![
                    Value::Empty,
                    "Renamed".to_string().into(),
                    existing.index.into(),
                    true.into(),
                ],
            ],
        ),
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(1, 1, 1));
    assert_eq!(
        repo.find_one_by_id(&existing.id).unwrap().unwrap().name,
        "Renamed"
    );
    let added = units_named(&connection, &existing.name);
    assert_eq!(added.len(), 1);
    assert_ne!(added[0].id, existing.id);
}

// covers: OMS-REG-CDIO-01.40, .105

#[actix_rt::test]
async fn a_name_in_another_letter_case_finds_its_unit_and_keeps_the_saved_name() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_lookup_letter_case",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let existing = mock_unit(&connection);
    assert_ne!(existing.name, existing.name.to_uppercase());

    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["name", "index", "is_active"],
            vec![vec![
                existing.name.to_uppercase().into(),
                (existing.index + 1).into(),
                true.into(),
            ]],
        ),
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(0, 1, 0));
    assert_eq!(
        UnitRowRepository::new(&connection)
            .find_one_by_id(&existing.id)
            .unwrap(),
        Some(UnitRow {
            index: existing.index + 1,
            ..existing
        })
    );
}

#[actix_rt::test]
async fn a_name_without_the_saved_names_spaces_finds_its_unit() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_lookup_padded_name",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let repo = UnitRowRepository::new(&connection);
    let padded = UnitRow {
        id: "unit_padded".to_string(),
        name: " Capsule ".to_string(),
        description: None,
        index: 3,
        is_active: true,
    };
    repo.upsert_one(&padded).unwrap();

    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["name", "index", "is_active"],
            vec![vec!["Capsule".to_string().into(), 4.into(), true.into()]],
        ),
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(0, 1, 0));
    assert_eq!(
        repo.find_one_by_id(&padded.id).unwrap(),
        Some(UnitRow { index: 4, ..padded })
    );
    assert_eq!(units_named(&connection, "Capsule"), vec![]);
}

fn bottle(id: &str, is_active: bool) -> UnitRow {
    UnitRow {
        id: id.to_string(),
        name: "Bottle".to_string(),
        description: None,
        index: 7,
        is_active,
    }
}

// covers: OMS-REG-CDIO-01.24

#[actix_rt::test]
async fn a_name_two_active_units_share_asks_for_the_id() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_unit_ambiguous_name",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let repo = UnitRowRepository::new(&connection);
    // Saved before names had to be unique.
    repo.upsert_one(&bottle("bottle_a", true)).unwrap();
    repo.upsert_one(&bottle("bottle_b", true)).unwrap();
    let headers = vec!["id", "name", "index", "is_active"];

    let path = write_file(
        dir.path(),
        unit_sheet(
            headers.clone(),
            // A blank index isn't reported as missing: without its unit, the row stops there.
            vec![vec![
                Value::Empty,
                "Bottle".to_string().into(),
                Value::Empty,
                true.into(),
            ]],
        ),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.row, e.column.as_deref(), e.message.as_str()))
        .collect();
    assert_eq!(
        errors,
        vec![(
            Some(2),
            Some("name"),
            "ambiguous reference, please provide id instead"
        )]
    );
    assert_eq!(units_named(&connection, "Bottle").len(), 2);

    // The id settles it.
    let path = write_file(
        dir.path(),
        unit_sheet(
            headers,
            vec![vec![
                "bottle_b".to_string().into(),
                "Bottle".to_string().into(),
                9.into(),
                true.into(),
            ]],
        ),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(0, 1, 0));
    assert_eq!(
        repo.find_one_by_id("bottle_b").unwrap(),
        Some(UnitRow {
            index: 9,
            ..bottle("bottle_b", true)
        })
    );
    assert_eq!(
        repo.find_one_by_id("bottle_a").unwrap(),
        Some(bottle("bottle_a", true))
    );
}

// covers: OMS-REG-CDIO-01.41

#[actix_rt::test]
async fn a_new_unit_can_take_an_inactive_units_name_but_not_an_active_ones() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_unit_new_id_duplicate_name",
        MockDataInserts::none().units(),
    )
    .await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let repo = UnitRowRepository::new(&connection);
    repo.upsert_one(&bottle("bottle_old", false)).unwrap();
    let existing = mock_unit(&connection);
    let new_unit = |name: &str| {
        vec![
            "new_unit".to_string().into(),
            name.to_string().into(),
            1.into(),
            true.into(),
        ]
    };
    let headers = vec!["id", "name", "index", "is_active"];

    let path = write_file(
        dir.path(),
        unit_sheet(headers.clone(), vec![new_unit(&existing.name)]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.row, e.column.as_deref()))
        .collect();
    assert_eq!(errors, vec![(Some(2), Some("name"))]);
    assert_eq!(repo.find_one_by_id("new_unit").unwrap(), None);

    let path = write_file(dir.path(), unit_sheet(headers, vec![new_unit("Bottle")]));
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(1, 0, 0));
    assert!(repo.find_one_by_id("new_unit").unwrap().unwrap().is_active);
    assert_eq!(
        repo.find_one_by_id("bottle_old").unwrap(),
        Some(bottle("bottle_old", false))
    );
}

// covers: OMS-REG-CDIO-01.30, .33, .34

#[actix_rt::test]
async fn unit_rows_find_active_units_first_require_new_columns_and_delete_by_deactivating() {
    let (_, connection, connection_manager, _) =
        setup_all("central_data_unit_rules", MockDataInserts::none().units()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();
    let repo = UnitRowRepository::new(&connection);
    let existing = mock_unit(&connection);
    assert!(existing.is_active);
    // Inactive written last, so a lookup ignoring activity would find it.
    repo.upsert_one(&bottle("bottle_active", true)).unwrap();
    repo.upsert_one(&bottle("bottle_inactive", false)).unwrap();

    let headers = vec!["id", "name", "description", "index", "is_active"];
    let good_rows = || {
        vec![
            vec![
                Value::Empty,
                "Bottle".to_string().into(),
                "Glass".to_string().into(),
                Value::Empty,
                Value::Empty,
            ],
            vec![
                existing.id.clone().into(),
                existing.name.clone().into(),
                existing.description.clone().unwrap_or_default().into(),
                existing.index.into(),
                false.into(),
            ],
        ]
    };
    let mut rows = good_rows();
    rows.push(vec![
        Value::Empty,
        "Lozenge".to_string().into(),
        Value::Empty,
        Value::Empty,
        true.into(),
    ]);
    let path = write_file(dir.path(), unit_sheet(headers.clone(), rows));

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.row, e.column.as_deref(), e.message.as_str()))
        .collect();
    assert_eq!(
        errors,
        vec![(Some(4), Some("index"), "index is required for a new unit")]
    );
    assert_eq!(
        summary.tables,
        vec![TableChanges {
            table: CentralDataTable::Unit,
            inserted: 0,
            updated: 1,
            deleted: 1,
            unchanged: 0,
            error_count: 1,
        }]
    );
    assert_eq!(
        repo.find_one_by_id(&existing.id).unwrap(),
        Some(existing.clone())
    );

    let path = write_file(dir.path(), unit_sheet(headers, good_rows()));
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        repo.find_one_by_id("bottle_active")
            .unwrap()
            .unwrap()
            .description,
        Some("Glass".to_string())
    );
    assert_eq!(
        repo.find_one_by_id("bottle_inactive").unwrap(),
        Some(bottle("bottle_inactive", false))
    );
    assert!(
        !repo
            .find_one_by_id(&existing.id)
            .unwrap()
            .unwrap()
            .is_active
    );
}

// covers: OMS-REG-CDIO-01.15

#[actix_rt::test]
async fn errors_past_the_listed_rows_are_counted_not_listed() {
    let (_, _, connection_manager, _) =
        setup_all("central_data_error_cap", MockDataInserts::none().units()).await;
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context().unwrap();
    let dir = TempDir::new().unwrap();

    let bad_rows = MAX_ROWS_LISTED + 100;
    let rows = (0..bad_rows)
        .map(|n| {
            vec![
                format!("Unit {n}").into(),
                "x".to_string().into(),
                true.into(),
            ]
        })
        .collect();
    let path = write_file(
        dir.path(),
        unit_sheet(vec!["name", "index", "is_active"], rows),
    );

    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(summary.errors.len(), MAX_ROWS_LISTED);
    assert_eq!(summary.error_count, bad_rows as u32);
    assert_eq!(summary.tables[0].error_count, bad_rows as u32);
    assert_eq!(summary.errors[0].row, Some(2));
}

// Location types

const LOCATION_TYPE_HEADERS: [&str; 6] = [
    "id",
    "code",
    "name",
    "min_temperature",
    "max_temperature",
    "delete",
];

fn location_type_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![sheet_data(
        "location_type",
        &LOCATION_TYPE_HEADERS,
        rows,
    )])
    .unwrap()
}

/// One row of `LOCATION_TYPE_HEADERS`; blank cells are `""`.
fn location_type_row(cells: [&str; 6]) -> Vec<Value> {
    cells
        .into_iter()
        .map(|cell| match cell {
            "" => Value::Empty,
            cell => Value::Text(cell.to_string()),
        })
        .collect()
}

fn unused_location_type() -> LocationTypeRow {
    LocationTypeRow {
        id: "unused_type".to_string(),
        code: "UNUSED".to_string(),
        name: "Unused".to_string(),
        min_temperature: 15.0,
        max_temperature: 25.0,
    }
}

fn row_errors(summary: &super::ImportSummary) -> Vec<(u32, Option<&str>, &str)> {
    summary
        .errors
        .iter()
        .map(|e| {
            let row = e.row.expect("every error here is on a row");
            (row, e.column.as_deref(), e.message.as_str())
        })
        .collect()
}

/// Location type a is a location's type and b an item's restricted type.
async fn location_type_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (_, connection, connection_manager, _) = setup_all(
        name,
        MockDataInserts::none().names().stores().locations().items(),
    )
    .await;
    LocationTypeRowRepository::new(&connection)
        .upsert_one(&unused_location_type())
        .unwrap();
    (
        connection,
        ServiceProvider::new(connection_manager),
        TempDir::new().unwrap(),
    )
}

// covers: OMS-REG-CDIO-01.10, .11, .65

#[actix_rt::test]
async fn location_types_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) =
        location_type_setup("central_data_location_type_round_trip").await;
    // A code taken from a padded legacy name keeps its spaces.
    LocationTypeRowRepository::new(&connection)
        .upsert_one(&LocationTypeRow {
            id: "padded_type".to_string(),
            code: "Fridge ".to_string(),
            name: "Fridge ".to_string(),
            min_temperature: 2.5,
            max_temperature: 8.0,
        })
        .unwrap();
    let before = LocationTypeRowRepository::new(&connection)
        .find_all()
        .unwrap();
    let ctx = service_provider.basic_context().unwrap();

    let table = ExportTable {
        table: CentralDataTable::LocationType,
        filter: ExportFilter::default(),
    };
    let bytes = CentralDataService.export(&ctx, &[table]).unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();

    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, before.len() as u32);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        LocationTypeRowRepository::new(&connection)
            .find_all()
            .unwrap(),
        before
    );
}

// covers: OMS-REG-CDIO-01.46, .47

#[actix_rt::test]
async fn a_location_type_export_searches_name_and_code() {
    let (_, service_provider, _) = location_type_setup("central_data_location_type_filter").await;
    let ctx = service_provider.basic_context().unwrap();
    let search = |contains: &str| ExportTable {
        table: CentralDataTable::LocationType,
        filter: ExportFilter {
            contains: Some(contains.to_string()),
            // No active flag, so it's ignored.
            is_active: Some(false),
        },
    };

    let counts = CentralDataService
        .export_counts(&ctx, &[search("unused")])
        .unwrap();
    assert_eq!(
        counts,
        vec![ExportCount {
            table: CentralDataTable::LocationType,
            count: RecordCount {
                matching: 1,
                total: 3,
            },
        }]
    );
    let counts = CentralDataService
        .export_counts(&ctx, &[search("LOCATION_TYPE")])
        .unwrap();
    assert_eq!(counts[0].count.matching, 2);
}

// covers: OMS-REG-CDIO-01.73

#[actix_rt::test]
async fn a_code_finds_a_location_type_an_earlier_row_adds() {
    let (connection, service_provider, dir) =
        location_type_setup("central_data_location_type_added_earlier_in_file").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        location_type_sheet(vec![
            location_type_row(["cold_a", "COLD", "Cold", "2", "8", ""]),
            // A new id beside the code row 2 adds.
            location_type_row(["cold_b", "COLD", "Cold", "2", "8", ""]),
            // No id: finds row 2's location type and changes it.
            location_type_row(["", "COLD", "Colder", "", "", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                3,
                Some("code"),
                "code and id conflict: Cold has code COLD and id cold_a, but this row has code COLD and id cold_b"
            ),
            (4, None, "Row 2 already changes this record"),
        ]
    );
    assert_eq!(
        LocationTypeRowRepository::new(&connection)
            .find_one_by_id("cold_a")
            .unwrap(),
        None
    );
}

// covers: OMS-REG-CDIO-01.12, .35, .63, .77, .79

#[actix_rt::test]
async fn location_type_rows_add_and_update_by_code_and_check_temperatures() {
    let (connection, service_provider, dir) =
        location_type_setup("central_data_location_type_upsert").await;
    let ctx = service_provider.basic_context().unwrap();
    let unused = unused_location_type();

    let path = write_file(
        dir.path(),
        location_type_sheet(vec![
            location_type_row(["", "FREEZER", "Freezer", "-25", "-15", ""]),
            // Found by code; blank cells keep their values.
            location_type_row(["", "UNUSED", "Room", "", "30", ""]),
            location_type_row(["", "NEW", "", "abc", "", ""]),
            location_type_row(["", "BACKWARDS", "Backwards", "8", "2", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (4, Some("min_temperature"), "\"abc\" must be a number"),
            (4, Some("name"), "name is required for a new location type"),
            (
                4,
                Some("max_temperature"),
                "max_temperature is required for a new location type"
            ),
            (
                5,
                Some("max_temperature"),
                "max_temperature 2 is below min_temperature 8"
            ),
        ]
    );
    assert_eq!(
        LocationTypeRowRepository::new(&connection)
            .find_one_by_id(&unused.id)
            .unwrap(),
        Some(unused.clone())
    );

    let path = write_file(
        dir.path(),
        location_type_sheet(vec![
            location_type_row(["", "FREEZER", "Freezer", "-25", "-15", ""]),
            location_type_row(["", "UNUSED", "Room", "", "30", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].updated),
        (1, 1)
    );
    assert_eq!(
        summary.changes[1].fields,
        vec![
            FieldChange {
                column: "name",
                from: "Unused".to_string(),
                to: "Room".to_string(),
            },
            FieldChange {
                column: "max_temperature",
                from: "25".to_string(),
                to: "30".to_string(),
            },
        ]
    );
    let repo = LocationTypeRowRepository::new(&connection);
    assert_eq!(
        repo.find_one_by_id(&unused.id).unwrap(),
        Some(LocationTypeRow {
            name: "Room".to_string(),
            max_temperature: 30.0,
            ..unused
        })
    );
    let freezer = repo
        .find_all()
        .unwrap()
        .into_iter()
        .find(|location_type| location_type.code == "FREEZER")
        .unwrap();
    assert_eq!(
        (freezer.min_temperature, freezer.max_temperature),
        (-25.0, -15.0)
    );
}

// covers: OMS-REG-CDIO-01.39, .40, .51

#[actix_rt::test]
async fn a_location_type_code_is_not_changed_by_import() {
    let (connection, service_provider, dir) =
        location_type_setup("central_data_location_type_conflicts").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        location_type_sheet(vec![
            // The id's location type has another code.
            location_type_row(["unused_type", "RENAMED", "", "", "", ""]),
            // A new id beside a saved code.
            location_type_row(["new_id", "UNUSED", "Copy", "1", "2", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("code"),
                "code and id conflict: Unused has code UNUSED and id unused_type, but this row has code RENAMED and id unused_type"
            ),
            (
                3,
                Some("code"),
                "code and id conflict: Unused has code UNUSED and id unused_type, but this row has code UNUSED and id new_id"
            ),
        ]
    );

    // Another letter case is another code, so it adds a location type.
    let path = write_file(
        dir.path(),
        location_type_sheet(vec![location_type_row([
            "", "unused", "Lower", "1", "2", "",
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].inserted, 1);
    assert_eq!(
        LocationTypeRowRepository::new(&connection)
            .find_all()
            .unwrap()
            .len(),
        4
    );
}

// covers: OMS-REG-CDIO-01.24

#[actix_rt::test]
async fn a_code_two_location_types_share_asks_for_the_id() {
    let (_, service_provider, dir) =
        location_type_setup("central_data_location_type_ambiguous_code").await;
    let ctx = service_provider.basic_context().unwrap();
    // Legacy data can hold duplicates the import would refuse.
    LocationTypeRowRepository::new(&ctx.connection)
        .upsert_one(&LocationTypeRow {
            id: "unused_copy".to_string(),
            ..unused_location_type()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        location_type_sheet(vec![
            location_type_row(["", "UNUSED", "Renamed", "", "", ""]),
            location_type_row(["unused_copy", "UNUSED", "Renamed", "", "", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("code"),
            "ambiguous reference, please provide id instead"
        )]
    );
    assert_eq!(summary.tables[0].updated, 1);
}

// covers: OMS-REG-CDIO-01.25, .26, .36, .55, .78

#[actix_rt::test]
async fn a_delete_row_removes_an_unused_location_type_only() {
    let (connection, service_provider, dir) =
        location_type_setup("central_data_location_type_delete").await;
    let ctx = service_provider.basic_context().unwrap();
    let repo = LocationTypeRowRepository::new(&connection);

    let path = write_file(
        dir.path(),
        location_type_sheet(vec![
            // A location's type, and an item's.
            location_type_row(["location_type_a_id", "", "", "", "", "DELETE"]),
            location_type_row(["", "freezer_location_type", "", "", "", "DELETE"]),
            location_type_row(["", "MISSING", "", "", "", "DELETE"]),
            location_type_row(["", "UNUSED", "Renamed", "", "", "DELETE"]),
            location_type_row(["", "UNUSED", "", "", "", "Delete"]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("delete"),
                "cold_location_type (cold_location_type) is used by a location, so it can't be deleted"
            ),
            (
                3,
                Some("delete"),
                "freezer_location_type (freezer_location_type) is used by an item, so it can't be deleted"
            ),
            (
                5,
                Some("delete"),
                "A row marked DELETE can't also change name. Clear it or put back the saved value"
            ),
            (
                6,
                Some("delete"),
                "\"Delete\" is not valid. Type DELETE to delete this row, or leave it blank"
            ),
        ]
    );
    assert_eq!(repo.find_all().unwrap().len(), 3);

    // As exported: every saved value kept. A row for a location type already gone changes nothing.
    let path = write_file(
        dir.path(),
        location_type_sheet(vec![
            location_type_row(["unused_type", "UNUSED", "Unused", "15", "25", "DELETE"]),
            location_type_row(["", "MISSING", "", "", "", "DELETE"]),
            location_type_row(["missing_id", "", "", "", "", "DELETE"]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].deleted, summary.tables[0].unchanged),
        (1, 2)
    );
    assert_eq!(
        summary.changes,
        vec![RowChange {
            sheet: "location_type".to_string(),
            row: 2,
            record: "Unused (UNUSED)".to_string(),
            change: Change::Deleted,
            fields: vec![],
        }]
    );
    assert_eq!(repo.find_one_by_id("unused_type").unwrap(), None);
}

// covers: OMS-REG-CDIO-01.78

#[actix_rt::test]
async fn a_delete_row_keeps_a_location_type_on_a_requisition_line_or_item_variant() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_location_type_delete_other_uses",
        MockDataInserts::all(),
    )
    .await;
    let dir = TempDir::new().unwrap();
    let ctx = ServiceProvider::new(connection_manager)
        .basic_context()
        .unwrap();
    let repo = LocationTypeRowRepository::new(&connection);
    for (id, code) in [("requested_type", "REQUESTED"), ("variant_type", "VARIANT")] {
        repo.upsert_one(&LocationTypeRow {
            id: id.to_string(),
            code: code.to_string(),
            name: code.to_string(),
            ..Default::default()
        })
        .unwrap();
    }
    RequisitionLineRowRepository::new(&connection)
        .upsert_one(&RequisitionLineRow {
            location_type_id: Some("requested_type".to_string()),
            ..mock_draft_request_requisition_line()
        })
        .unwrap();
    ItemVariantRowRepository::new(&connection)
        .upsert_one(&ItemVariantRow {
            location_type_id: Some("variant_type".to_string()),
            ..mock_item_a_variant_1()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        location_type_sheet(vec![
            location_type_row(["", "REQUESTED", "", "", "", "DELETE"]),
            location_type_row(["", "VARIANT", "", "", "", "DELETE"]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        summary
            .errors
            .iter()
            .map(|e| (e.row, e.column.clone(), e.message.clone()))
            .collect::<Vec<_>>(),
        vec![
            (
                Some(2),
                Some("delete".to_string()),
                "REQUESTED (REQUESTED) is used by a requisition line, so it can't be deleted"
                    .to_string()
            ),
            (
                Some(3),
                Some("delete".to_string()),
                "VARIANT (VARIANT) is used by an item variant, so it can't be deleted".to_string()
            ),
        ]
    );
    assert!(repo.find_one_by_id("requested_type").unwrap().is_some());
    assert!(repo.find_one_by_id("variant_type").unwrap().is_some());
}

const CURRENCY_HEADERS: [&str; 6] = [
    "id",
    "code",
    "rate",
    "is_home_currency",
    "date_updated",
    "is_active",
];

fn currency_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![sheet_data("currency", &CURRENCY_HEADERS, rows)]).unwrap()
}

/// One row of `CURRENCY_HEADERS`; blank cells are `""`.
fn currency_row(cells: [&str; 6]) -> Vec<Value> {
    cells
        .into_iter()
        .map(|cell| match cell {
            "" => Value::Empty,
            cell => Value::Text(cell.to_string()),
        })
        .collect()
}

fn usd() -> CurrencyRow {
    CurrencyRow {
        id: "usd".to_string(),
        code: "USD".to_string(),
        rate: 1.0,
        is_home_currency: true,
        date_updated: NaiveDate::from_ymd_opt(2026, 1, 15),
        is_active: true,
    }
}

fn nzd() -> CurrencyRow {
    CurrencyRow {
        id: "nzd".to_string(),
        code: "NZD".to_string(),
        rate: 1.6,
        is_home_currency: false,
        date_updated: None,
        is_active: true,
    }
}

fn find_currency(connection: &StorageConnection, id: &str) -> Option<CurrencyRow> {
    CurrencyRowRepository::new(connection)
        .find_one_by_id(id)
        .unwrap()
}

/// USD, the home currency; NZD; and an inactive NZD with the same code.
async fn currency_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (_, connection, connection_manager, _) = setup_all(name, MockDataInserts::none()).await;
    let repo = CurrencyRowRepository::new(&connection);
    for currency in [
        usd(),
        nzd(),
        CurrencyRow {
            id: "old_nzd".to_string(),
            rate: 1.4,
            is_active: false,
            ..nzd()
        },
    ] {
        repo.upsert_one(&currency).unwrap();
    }
    (
        connection,
        ServiceProvider::new(connection_manager),
        TempDir::new().unwrap(),
    )
}

// covers: OMS-REG-CDIO-01.10, .11, .65, .107

#[actix_rt::test]
async fn currencies_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) =
        currency_setup("central_data_currency_round_trip").await;
    // A rate with many decimals and a padded code must survive too.
    CurrencyRowRepository::new(&connection)
        .upsert_one(&CurrencyRow {
            id: "aud".to_string(),
            code: "AUD ".to_string(),
            rate: 0.123456789012345,
            is_home_currency: false,
            date_updated: NaiveDate::from_ymd_opt(2025, 12, 31),
            is_active: true,
        })
        .unwrap();
    let before = CurrencyRowRepository::new(&connection).find_all().unwrap();
    let ctx = service_provider.basic_context().unwrap();

    let table = ExportTable {
        table: CentralDataTable::Currency,
        filter: ExportFilter::default(),
    };
    let bytes = CentralDataService.export(&ctx, &[table]).unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();

    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 4);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        CurrencyRowRepository::new(&connection).find_all().unwrap(),
        before
    );
}

// covers: OMS-REG-CDIO-01.46

#[actix_rt::test]
async fn a_currency_export_searches_codes_and_filters_by_status() {
    let (_, service_provider, _) = currency_setup("central_data_currency_filter").await;
    let ctx = service_provider.basic_context().unwrap();
    let count = |contains: &str, is_active: Option<bool>| {
        CentralDataService
            .export_counts(
                &ctx,
                &[ExportTable {
                    table: CentralDataTable::Currency,
                    filter: ExportFilter {
                        contains: Some(contains.to_string()),
                        is_active,
                    },
                }],
            )
            .unwrap()[0]
            .count
    };

    assert_eq!(
        count("nz", None),
        RecordCount {
            matching: 2,
            total: 3
        }
    );
    assert_eq!(count("nz", Some(false)).matching, 1);
    assert_eq!(count("", Some(true)).matching, 2);
}

// covers: OMS-REG-CDIO-01.12, .63, .76, .108, .109

#[actix_rt::test]
async fn currency_rows_add_and_update_by_code_or_id() {
    let (connection, service_provider, dir) = currency_setup("central_data_currency_upsert").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "EUR", "0.9", "FALSE", "", "TRUE"]),
            // date_updated is export-only, so even a value that isn't a date is ignored.
            currency_row(["", "GBP", "", "", "18/11/2026", ""]),
            currency_row(["", "JPY", "0", "FALSE", "", "TRUE"]),
            currency_row(["", "XYZ", "abc", "FALSE", "", "TRUE"]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (3, Some("rate"), "rate is required for a new currency"),
            (
                3,
                Some("is_home_currency"),
                "is_home_currency is required for a new currency"
            ),
            (
                3,
                Some("is_active"),
                "is_active is required for a new currency"
            ),
            (4, Some("rate"), "rate must be above 0"),
            (5, Some("rate"), "\"abc\" must be a number"),
        ]
    );
    assert_eq!(
        CurrencyRowRepository::new(&connection)
            .find_all()
            .unwrap()
            .len(),
        3
    );

    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "EUR", "0.9", "FALSE", "2020-01-01", "TRUE"]),
            // Found by code, the active NZD; blank required cells keep their values.
            currency_row(["", "NZD", "1.7", "", "2020-01-01", ""]),
            // Found by id. A new date_updated alone changes nothing.
            currency_row(["usd", "USD", "", "", "2020-01-01", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (
            summary.tables[0].inserted,
            summary.tables[0].updated,
            summary.tables[0].unchanged
        ),
        (1, 1, 1)
    );
    assert_eq!(
        summary.changes[1].fields,
        vec![FieldChange {
            column: "rate",
            from: "1.6".to_string(),
            to: "1.7".to_string(),
        }]
    );
    // The server sets date_updated on each currency that changes.
    assert_eq!(
        find_currency(&connection, "nzd"),
        Some(CurrencyRow {
            rate: 1.7,
            date_updated: Some(today()),
            ..nzd()
        })
    );
    assert_eq!(find_currency(&connection, "usd"), Some(usd()));
    assert_eq!(find_currency(&connection, "old_nzd").unwrap().rate, 1.4);
    let eur = CurrencyRowRepository::new(&connection)
        .find_by_trimmed_code("EUR")
        .unwrap()
        .pop()
        .unwrap();
    assert_eq!(
        (
            eur.rate,
            eur.is_home_currency,
            eur.date_updated,
            eur.is_active
        ),
        (0.9, false, Some(today()), true)
    );
}

// covers: OMS-REG-CDIO-01.117, .118

#[actix_rt::test]
async fn the_home_currency_has_a_rate_of_1_and_stays_active() {
    let (connection, service_provider, dir) =
        currency_setup("central_data_currency_home_rate_and_active").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        // Made the home currency at its own rate.
        currency_sheet(vec![currency_row(["", "NZD", "", "TRUE", "", ""])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("rate"), "The home currency's rate must be 1")]
    );

    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "USD", "1.2", "", "", ""]),
            currency_row(["", "NZD", "", "", "", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("rate"), "The home currency's rate must be 1")]
    );

    let path = write_file(
        dir.path(),
        currency_sheet(vec![currency_row(["", "USD", "", "", "", "FALSE"])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("is_active"),
            "USD is the home currency, so it can't be inactive. Set its is_home_currency to FALSE as well, and make another currency the home currency"
        )]
    );

    // Given up as the home currency, it can be made inactive, in either row order.
    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "NZD", "1", "TRUE", "", ""]),
            currency_row(["", "USD", "0.6", "FALSE", "", "FALSE"]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert!(!find_currency(&connection, "usd").unwrap().is_active);
}

// covers: OMS-REG-CDIO-01.24, .39, .110

#[actix_rt::test]
async fn a_code_two_active_currencies_share_asks_for_the_id() {
    let (connection, service_provider, dir) =
        currency_setup("central_data_currency_ambiguous_code").await;
    let ctx = service_provider.basic_context().unwrap();
    // Legacy data can hold duplicates the import would refuse.
    CurrencyRowRepository::new(&connection)
        .upsert_one(&CurrencyRow {
            id: "nzd_copy".to_string(),
            ..nzd()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "NZD", "1.8", "", "", ""]),
            currency_row(["nzd_copy", "NZD", "1.8", "", "", ""]),
            // An inactive currency's id finds it, whatever shares its code.
            currency_row(["old_nzd", "NZD", "1.5", "", "", ""]),
            currency_row(["usd", "NZD", "", "", "", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("code"),
                "ambiguous reference, please provide id instead"
            ),
            (
                5,
                Some("code"),
                "code and id conflict: USD has code USD and id usd, but this row has code NZD and id usd"
            ),
        ]
    );
    assert_eq!(summary.tables[0].updated, 2);
}

// covers: OMS-REG-CDIO-01.110, .115

#[actix_rt::test]
async fn an_inactive_currency_does_not_make_an_active_ones_code_ambiguous() {
    let (connection, service_provider, dir) =
        currency_setup("central_data_currency_active_first").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        currency_sheet(vec![currency_row(["", "NZD", "1.8", "", "", ""])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(find_currency(&connection, "nzd").unwrap().rate, 1.8);
    assert_eq!(find_currency(&connection, "old_nzd").unwrap().rate, 1.4);

    // Making the active one inactive is a delete. With none active, the code finds the
    // inactive ones, so both now share it.
    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["nzd", "NZD", "", "", "", "FALSE"]),
            currency_row(["", "NZD", "1.9", "", "", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(summary.tables[0].deleted, 1);
    assert_eq!(
        row_errors(&summary),
        vec![(
            3,
            Some("code"),
            "ambiguous reference, please provide id instead"
        )]
    );
}

// covers: OMS-REG-CDIO-01.111

#[actix_rt::test]
async fn a_currency_cannot_be_made_active_beside_an_active_one_with_its_code() {
    let (connection, service_provider, dir) =
        currency_setup("central_data_currency_reactivate").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        currency_sheet(vec![currency_row(["old_nzd", "NZD", "", "", "", "TRUE"])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("is_active"),
            "Currency nzd is active with code NZD. Make one of them inactive"
        )]
    );

    // Once the other is inactive, on an earlier row, it can be.
    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["nzd", "NZD", "", "", "", "FALSE"]),
            currency_row(["old_nzd", "NZD", "", "", "", "TRUE"]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert!(find_currency(&connection, "old_nzd").unwrap().is_active);
}

// covers: OMS-REG-CDIO-01.112

#[actix_rt::test]
async fn only_one_currency_can_be_the_home_currency() {
    let (connection, service_provider, dir) = currency_setup("central_data_currency_home").await;
    let ctx = service_provider.basic_context().unwrap();
    let home_error = (
        2,
        Some("is_home_currency"),
        "NZD would be the home currency, and so would USD, but there can be only one. Set is_home_currency to FALSE for all but one",
    );

    let path = write_file(
        dir.path(),
        currency_sheet(vec![currency_row(["", "NZD", "1", "TRUE", "", ""])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(row_errors(&summary), vec![home_error]);
    assert!(!find_currency(&connection, "nzd").unwrap().is_home_currency);

    // An inactive home currency is still the home currency.
    CurrencyRowRepository::new(&connection)
        .upsert_one(&CurrencyRow {
            is_active: false,
            ..usd()
        })
        .unwrap();
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(row_errors(&summary), vec![home_error]);

    // Currencies that already share it must be put right in the same sheet, even by a row that
    // doesn't touch them: no row is to blame, so the sheet gets the error.
    CurrencyRowRepository::new(&connection)
        .upsert_one(&CurrencyRow {
            is_home_currency: true,
            rate: 1.0,
            ..nzd()
        })
        .unwrap();
    let path = write_file(
        dir.path(),
        currency_sheet(vec![currency_row(["", "EUR", "0.9", "FALSE", "", "TRUE"])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        summary.errors,
        vec![RowError {
            sheet: "currency".to_string(),
            row: None,
            column: Some("is_home_currency".to_string()),
            message: "NZD and USD are each the home currency, but there can be only one. Set is_home_currency to FALSE for all but one".to_string(),
        }]
    );

    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "EUR", "0.9", "FALSE", "", "TRUE"]),
            currency_row(["usd", "USD", "", "FALSE", "", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(home_currencies(&connection).unwrap().len(), 1);
}

// covers: OMS-REG-CDIO-01.112

#[actix_rt::test]
async fn the_home_currency_moves_whatever_the_row_order() {
    let (connection, service_provider, dir) =
        currency_setup("central_data_currency_move_home").await;
    let ctx = service_provider.basic_context().unwrap();

    // In code order, as an export writes them: the new home currency comes first.
    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "NZD", "1", "TRUE", "", ""]),
            currency_row(["", "USD", "0.6", "FALSE", "", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert!(find_currency(&connection, "nzd").unwrap().is_home_currency);
    assert!(!find_currency(&connection, "usd").unwrap().is_home_currency);

    // And back, with the old home currency first.
    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "NZD", "1.6", "FALSE", "", ""]),
            currency_row(["", "USD", "1", "TRUE", "", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert!(find_currency(&connection, "usd").unwrap().is_home_currency);
}

// covers: OMS-REG-CDIO-01.116

#[actix_rt::test]
async fn an_import_cannot_leave_no_home_currency() {
    let (connection, service_provider, dir) = currency_setup("central_data_currency_no_home").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "NZD", "1.7", "", "", ""]),
            currency_row(["", "USD", "", "FALSE", "", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let no_other_home = (
        3,
        Some("is_home_currency"),
        "USD is the home currency, and the sheet leaves no other home currency. Set another currency's is_home_currency to TRUE",
    );
    assert_eq!(row_errors(&summary), vec![no_other_home]);
    assert_eq!(summary.tables[0].error_count, 1);
    assert_eq!(find_currency(&connection, "usd"), Some(usd()));
    assert_eq!(find_currency(&connection, "nzd").unwrap().rate, 1.6);

    // A row that tries to make another currency the home currency, but fails on its own, leaves
    // none, and the message says so without claiming no row tried.
    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "NZD", "1.7", "TRUE", "", ""]),
            currency_row(["", "USD", "", "FALSE", "", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("rate"), "The home currency's rate must be 1"),
            no_other_home,
        ]
    );
}

// covers: OMS-REG-CDIO-01.112, .116

#[actix_rt::test]
async fn a_server_with_no_home_currency_must_be_given_one() {
    let (_, connection, connection_manager, _) =
        setup_all("central_data_currency_none_home", MockDataInserts::none()).await;
    let ctx = ServiceProvider::new(connection_manager)
        .basic_context()
        .unwrap();
    let dir = TempDir::new().unwrap();

    // No row is to blame, so the sheet gets the error.
    let path = write_file(
        dir.path(),
        currency_sheet(vec![currency_row(["", "NZD", "1.6", "FALSE", "", "TRUE"])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        summary.errors,
        vec![RowError {
            sheet: "currency".to_string(),
            row: None,
            column: Some("is_home_currency".to_string()),
            message: "No currency is the home currency. Set is_home_currency to TRUE for one, at a rate of 1".to_string(),
        }]
    );
    assert_eq!(summary.tables[0].error_count, 1);

    // Nor with two.
    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "NZD", "1", "TRUE", "", "TRUE"]),
            currency_row(["", "USD", "1", "TRUE", "", "TRUE"]),
            currency_row(["", "EUR", "1", "TRUE", "", "TRUE"]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary)[0],
        (
            2,
            Some("is_home_currency"),
            "NZD would be the home currency, and so would EUR and USD, but there can be only one. Set is_home_currency to FALSE for all but one"
        )
    );
    assert_eq!(summary.error_count, 3);

    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "NZD", "1.6", "FALSE", "", "TRUE"]),
            currency_row(["", "USD", "1", "TRUE", "", "TRUE"]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        CurrencyRowRepository::new(&connection)
            .find_all()
            .unwrap()
            .len(),
        2
    );
}

// covers: OMS-REG-CDIO-01.119

#[actix_rt::test]
async fn a_home_currency_an_invoice_uses_stays_the_home_currency() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_currency_home_in_use",
        MockDataInserts::none().names().stores(),
    )
    .await;
    let repo = CurrencyRowRepository::new(&connection);
    repo.upsert_one(&usd()).unwrap();
    repo.upsert_one(&nzd()).unwrap();
    InvoiceRowRepository::new(&connection)
        .upsert_one(&InvoiceRow {
            currency_id: Some("usd".to_string()),
            ..mock_outbound_shipment_a()
        })
        .unwrap();
    let ctx = ServiceProvider::new(connection_manager)
        .basic_context()
        .unwrap();
    let dir = TempDir::new().unwrap();

    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "NZD", "1", "TRUE", "", ""]),
            currency_row(["", "USD", "0.6", "FALSE", "", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert!(row_errors(&summary).contains(&(
        3,
        Some("is_home_currency"),
        "USD is used by an invoice as the home currency, so it must stay the home currency"
    )));
    // Row 2's error is found after the sheet's last row, and takes it out of the count.
    assert_eq!(summary.tables[0].updated, 0);
    assert_eq!(find_currency(&connection, "usd"), Some(usd()));
    assert_eq!(find_currency(&connection, "nzd"), Some(nzd()));

    // A sheet that leaves USD the home currency imports.
    let path = write_file(
        dir.path(),
        currency_sheet(vec![currency_row(["", "NZD", "1.7", "", "", ""])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
}

// covers: OMS-REG-CDIO-01.113

#[actix_rt::test]
async fn a_saved_currency_with_a_rate_of_0_stays_editable() {
    let (connection, service_provider, dir) =
        currency_setup("central_data_currency_zero_rate").await;
    let ctx = service_provider.basic_context().unwrap();
    CurrencyRowRepository::new(&connection)
        .upsert_one(&CurrencyRow { rate: 0.0, ..nzd() })
        .unwrap();

    let path = write_file(
        dir.path(),
        currency_sheet(vec![currency_row(["nzd", "NZD", "0", "", "", "FALSE"])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert!(!find_currency(&connection, "nzd").unwrap().is_active);

    let path = write_file(
        dir.path(),
        currency_sheet(vec![currency_row(["nzd", "NZD", "-1", "", "", ""])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("rate"), "rate must be above 0")]
    );
}

const ITEM_HEADERS: [&str; 16] = [
    "id",
    "code",
    "name",
    "unit_name",
    "unit_id",
    "strength",
    "ven_category",
    "default_pack_size",
    "type",
    "is_active",
    "is_vaccine",
    "vaccine_doses",
    "restricted_location_type_code",
    "restricted_location_type_id",
    "volume_per_pack",
    "universal_code",
];

fn item_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![sheet_data("item", &ITEM_HEADERS, rows)]).unwrap()
}

/// One row of `ITEM_HEADERS`; blank cells are `""`.
fn item_row(cells: [&str; 16]) -> Vec<Value> {
    cells
        .into_iter()
        .map(|cell| match cell {
            "" => Value::Empty,
            cell => Value::Text(cell.to_string()),
        })
        .collect()
}

/// A row that only names the item, leaving every other column blank.
fn item_named(id: &'static str, code: &'static str) -> [&'static str; 16] {
    let mut cells = [""; 16];
    cells[0] = id;
    cells[1] = code;
    cells
}

/// `item_named(id, code)` with the given cells filled in by position.
fn item_with(cells: &[(usize, &'static str)], code: &'static str) -> Vec<Value> {
    let mut row = item_named("", code);
    for (position, value) in cells {
        row[*position] = value;
    }
    item_row(row)
}

/// A complete new item row with the given references.
fn new_item(
    code: &'static str,
    unit_name: &'static str,
    unit_id: &'static str,
    location_type: &'static str,
) -> Vec<Value> {
    item_with(
        &[
            (2, "New"),
            (3, unit_name),
            (4, unit_id),
            (6, "N"),
            (7, "1"),
            (8, "STOCK"),
            (9, "TRUE"),
            (10, "FALSE"),
            (11, "0"),
            (12, location_type),
            (14, "0"),
        ],
        code,
    )
}

fn paracetamol() -> ItemRow {
    ItemRow {
        id: "paracetamol".to_string(),
        code: "PARA".to_string(),
        name: "Paracetamol".to_string(),
        unit_id: Some("tab".to_string()),
        strength: Some("500mg".to_string()),
        ven_category: VENCategory::E,
        default_pack_size: 100.0,
        r#type: ItemType::Stock,
        legacy_record: r#"{"margin":0.3}"#.to_string(),
        is_active: true,
        is_vaccine: false,
        vaccine_doses: 0,
        restricted_location_type_id: Some("cold".to_string()),
        volume_per_pack: 0.25,
        universal_code: Some("UPC1".to_string()),
        custom_fields: Some(serde_json::json!({ "user_field_1": "Cold chain" })),
    }
}

fn find_item(connection: &StorageConnection, code: &str) -> ItemRow {
    ItemRowRepository::new(connection)
        .find_one_by_code(code)
        .unwrap()
        .unwrap()
}

/// Units Tab and Vial, an inactive Tab, location types COLD and FREEZER, and Paracetamol.
async fn item_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (_, connection, connection_manager, _) = setup_all(name, MockDataInserts::none()).await;
    let units = UnitRowRepository::new(&connection);
    for (id, name, is_active) in [
        ("tab", "Tab", true),
        ("vial", "Vial", true),
        ("old_tab", "Tab", false),
    ] {
        units
            .upsert_one(&UnitRow {
                id: id.to_string(),
                name: name.to_string(),
                description: None,
                index: 1,
                is_active,
            })
            .unwrap();
    }
    for (id, code) in [("cold", "COLD"), ("freezer", "FREEZER")] {
        LocationTypeRowRepository::new(&connection)
            .upsert_one(&LocationTypeRow {
                id: id.to_string(),
                code: code.to_string(),
                name: code.to_string(),
                ..Default::default()
            })
            .unwrap();
    }
    ItemRowRepository::new(&connection)
        .upsert_one(&paracetamol())
        .unwrap();
    (
        connection,
        ServiceProvider::new(connection_manager),
        TempDir::new().unwrap(),
    )
}

fn all_items() -> ExportTable {
    ExportTable {
        table: CentralDataTable::Item,
        filter: ExportFilter::default(),
    }
}

// covers: OMS-REG-CDIO-01.10, .11, .22, .65

#[actix_rt::test]
async fn items_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) = item_setup("central_data_item_round_trip").await;
    // Leading zeros, padded text, an inactive vaccine and no references must survive.
    ItemRowRepository::new(&connection)
        .upsert_one(&ItemRow {
            id: "zinc".to_string(),
            code: "007".to_string(),
            name: "Zinc ".to_string(),
            strength: Some(" 20mg".to_string()),
            default_pack_size: 2.5,
            r#type: ItemType::NonStock,
            is_active: false,
            is_vaccine: true,
            vaccine_doses: 10,
            ..Default::default()
        })
        .unwrap();
    let before = ItemRowRepository::new(&connection).find_all().unwrap();
    let ctx = service_provider.basic_context().unwrap();

    let bytes = CentralDataService.export(&ctx, &[all_items()]).unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();

    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 2);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        ItemRowRepository::new(&connection).find_all().unwrap(),
        before
    );
}

// covers: OMS-REG-CDIO-01.100

#[actix_rt::test]
async fn a_saved_code_with_a_tab_around_it_is_found() {
    let (connection, service_provider, dir) = item_setup("central_data_item_tab_code").await;
    // SQL trims only spaces, so the tab has to survive the read for the code to find the item.
    ItemRowRepository::new(&connection)
        .upsert_one(&ItemRow {
            id: "zinc".to_string(),
            code: "ZN\t".to_string(),
            name: "Zinc".to_string(),
            default_pack_size: 1.0,
            ..Default::default()
        })
        .unwrap();
    let before = ItemRowRepository::new(&connection).find_all().unwrap();
    let ctx = service_provider.basic_context().unwrap();

    // With the id column, id and code must find the same item.
    let bytes = CentralDataService.export(&ctx, &[all_items()]).unwrap();
    let summary = CentralDataService
        .import(
            &ctx,
            &write_file(dir.path(), bytes),
            &no_sessions(),
            today(),
        )
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 2);

    // Without it, the code alone must find the item, not add a second.
    let bytes = sheet::write(vec![sheet_data(
        "item",
        &["code", "name"],
        vec![vec!["ZN\t".to_string().into(), "Zinc".to_string().into()]],
    )])
    .unwrap();
    let summary = CentralDataService
        .import(
            &ctx,
            &write_file(dir.path(), bytes),
            &no_sessions(),
            today(),
        )
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].unchanged),
        (0, 1)
    );
    assert_eq!(
        ItemRowRepository::new(&connection).find_all().unwrap(),
        before
    );
}

// covers: OMS-REG-CDIO-01.105

#[actix_rt::test]
async fn an_item_finds_its_unit_by_name_in_any_letter_case() {
    let (connection, service_provider, dir) = item_setup("central_data_item_unit_case").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        item_sheet(vec![new_item("AMOX", "VIAL", "", "")]),
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        find_item(&connection, "AMOX").unit_id.as_deref(),
        Some("vial")
    );
}

// covers: OMS-REG-CDIO-01.46, .47

#[actix_rt::test]
async fn an_item_export_searches_code_and_name_and_filters_by_status() {
    let (connection, service_provider, _) = item_setup("central_data_item_filter").await;
    ItemRowRepository::new(&connection)
        .upsert_one(&ItemRow {
            id: "zinc".to_string(),
            code: "ZN".to_string(),
            name: "Zinc".to_string(),
            is_active: false,
            ..Default::default()
        })
        .unwrap();
    let ctx = service_provider.basic_context().unwrap();
    let matching = |contains: Option<&str>, is_active: Option<bool>| {
        let table = ExportTable {
            table: CentralDataTable::Item,
            filter: ExportFilter {
                contains: contains.map(str::to_string),
                is_active,
            },
        };
        let count = CentralDataService.export_counts(&ctx, &[table]).unwrap()[0].count;
        assert_eq!(count.total, 2);
        count.matching
    };

    assert_eq!(matching(Some(" para "), None), 1);
    assert_eq!(matching(Some("zn"), None), 1);
    assert_eq!(matching(None, Some(false)), 1);
    assert_eq!(matching(Some("para"), Some(false)), 0);
    assert_eq!(matching(Some(""), None), 2);
}

// covers: OMS-REG-CDIO-01.211

#[actix_rt::test]
async fn a_new_name_missing_its_type_lists_the_types() {
    let (_, service_provider, dir) = name_setup("central_data_name_missing_type").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        name_sheet(vec![new_name_row(&[
            ("code", "NEWN"),
            ("name", "New name"),
        ])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("type"),
            "type is required for a new name and must be one of FACILITY, BUILD, INVAD, REPACK, STORE, OTHERS"
        )]
    );
}

// covers: OMS-REG-CDIO-01.211

#[actix_rt::test]
async fn a_missing_choice_cell_lists_its_choices() {
    let (_, service_provider, dir) = item_setup("central_data_item_missing_choice").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        item_sheet(vec![item_row([
            "",
            "AMOX",
            "Amoxicillin",
            "",
            "",
            "",
            "",
            "20",
            "",
            "TRUE",
            "",
            "",
            "",
            "",
            "",
            "",
        ])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("type"),
            "type is required for a new item and must be one of STOCK, SERVICE, NON_STOCK"
        )]
    );
}

// covers: OMS-REG-CDIO-01.12, .35, .37, .58, .63, .81, .84, .86, .87

#[actix_rt::test]
async fn item_rows_add_and_update_by_code() {
    let (connection, service_provider, dir) = item_setup("central_data_item_upsert").await;
    let ctx = service_provider.basic_context().unwrap();
    let new_item = [
        "",
        "AMOX",
        "Amoxicillin",
        "Vial",
        "",
        "250mg",
        "v",
        "20",
        "stock",
        "TRUE",
        "FALSE",
        "0",
        "FREEZER",
        "",
        "0.5",
        "",
    ];
    // Found by code; blank required cells keep their values, blank optional ones clear them,
    // including the saved unit and location type.
    let mut renamed = item_named("", "PARA");
    renamed[2] = "Paracetamol tablets";

    let path = write_file(
        dir.path(),
        item_sheet(vec![
            item_row(new_item),
            item_row(renamed),
            item_row([
                "", "NEW", "", "", "", "", "X", "1", "drug", "", "", "", "", "", "-1", "",
            ]),
            item_row([
                "", "ZERO", "Zero", "", "", "", "N", "0", "STOCK", "TRUE", "FALSE", "0", "", "",
                "0", "",
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                4,
                Some("ven_category"),
                "\"X\" must be one of V, E, N, NOT_ASSIGNED"
            ),
            (
                4,
                Some("type"),
                "\"drug\" must be one of STOCK, SERVICE, NON_STOCK"
            ),
            (4, Some("name"), "name is required for a new item"),
            (4, Some("is_active"), "is_active is required for a new item"),
            (
                4,
                Some("volume_per_pack"),
                "volume_per_pack can't be negative"
            ),
            (
                5,
                Some("default_pack_size"),
                "default_pack_size must be above 0"
            ),
        ]
    );
    assert_eq!(find_item(&connection, "PARA"), paracetamol());

    let path = write_file(
        dir.path(),
        item_sheet(vec![item_row(new_item), item_row(renamed)]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].updated),
        (1, 1)
    );
    assert_eq!(summary.changes[1].record, "Paracetamol tablets (PARA)");
    let changed: Vec<&str> = summary.changes[1]
        .fields
        .iter()
        .map(|field| field.column)
        .collect();
    assert_eq!(
        changed,
        [
            "name",
            "unit_name",
            "unit_id",
            "strength",
            "ven_category",
            "restricted_location_type_code",
            "restricted_location_type_id",
            "volume_per_pack",
            "universal_code",
        ]
    );
    assert_eq!(
        find_item(&connection, "PARA"),
        ItemRow {
            name: "Paracetamol tablets".to_string(),
            unit_id: None,
            strength: None,
            ven_category: VENCategory::NotAssigned,
            restricted_location_type_id: None,
            volume_per_pack: 0.0,
            universal_code: None,
            ..paracetamol()
        }
    );
    let amoxicillin = find_item(&connection, "AMOX");
    assert_eq!(
        amoxicillin,
        ItemRow {
            id: amoxicillin.id.clone(),
            code: "AMOX".to_string(),
            name: "Amoxicillin".to_string(),
            unit_id: Some("vial".to_string()),
            strength: Some("250mg".to_string()),
            ven_category: VENCategory::V,
            default_pack_size: 20.0,
            r#type: ItemType::Stock,
            restricted_location_type_id: Some("freezer".to_string()),
            volume_per_pack: 0.5,
            ..Default::default()
        }
    );
}

// covers: OMS-REG-CDIO-01.23, .84

#[actix_rt::test]
async fn item_references_are_found_by_code_or_id() {
    let (connection, service_provider, dir) = item_setup("central_data_item_references").await;
    let ctx = service_provider.basic_context().unwrap();
    // A unit name and id that disagree, then an unknown unit, location type and unit id.
    let path = write_file(
        dir.path(),
        item_sheet(vec![
            item_with(&[(3, "Vial"), (4, "tab")], "PARA"),
            new_item("B", "Box", "", "WARM"),
            new_item("C", "", "missing_unit", ""),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("unit_name"),
                "unit_name and unit_id conflict: Vial resolves to vial but unit_id contains tab"
            ),
            (3, Some("unit_name"), "unit_name \"Box\" not found"),
            (
                3,
                Some("restricted_location_type_code"),
                "restricted_location_type_code \"WARM\" not found"
            ),
            (4, Some("unit_id"), "unit_id \"missing_unit\" not found"),
        ]
    );

    // A name the active Tab and an inactive one share finds the active one; an id alone finds
    // its record, and a code finds its location type.
    let path = write_file(
        dir.path(),
        item_sheet(vec![
            new_item("B", "Tab", "", "FREEZER"),
            new_item("C", "", "old_tab", ""),
            item_with(&[(4, "vial"), (13, "freezer")], "PARA"),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let references = |code: &str| {
        let item = find_item(&connection, code);
        (item.unit_id, item.restricted_location_type_id)
    };
    assert_eq!(
        references("B"),
        (Some("tab".to_string()), Some("freezer".to_string()))
    );
    assert_eq!(references("C"), (Some("old_tab".to_string()), None));
    assert_eq!(
        references("PARA"),
        (Some("vial".to_string()), Some("freezer".to_string()))
    );

    // A sheet without the reference columns keeps them.
    let bytes = sheet::write(vec![sheet_data(
        "item",
        &["code", "name"],
        vec![vec![
            Value::Text("PARA".to_string()),
            Value::Text("Renamed".to_string()),
        ]],
    )])
    .unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        references("PARA"),
        (Some("vial".to_string()), Some("freezer".to_string()))
    );
}

// covers: OMS-REG-CDIO-01.39, .51, .73, .85

#[actix_rt::test]
async fn an_item_code_is_not_changed_or_taken_by_import() {
    let (connection, service_provider, dir) = item_setup("central_data_item_conflicts").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        item_sheet(vec![
            item_row([
                "amox",
                "AMOX",
                "Amoxicillin",
                "",
                "",
                "",
                "N",
                "1",
                "STOCK",
                "TRUE",
                "FALSE",
                "0",
                "",
                "",
                "0",
                "",
            ]),
            // A new id beside a code added earlier in the file, then beside a saved one.
            item_row(item_named("copy_id", "AMOX")),
            item_row(item_named("new_id", "PARA")),
            // The id's item has another code.
            item_row(item_named("paracetamol", "AMOX")),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                3,
                Some("code"),
                "code and id conflict: Amoxicillin has code AMOX and id amox, but this row has code AMOX and id copy_id"
            ),
            (
                4,
                Some("code"),
                "code and id conflict: Paracetamol has code PARA and id paracetamol, but this row has code PARA and id new_id"
            ),
            (
                5,
                Some("code"),
                "code and id conflict: Paracetamol has code PARA and id paracetamol, but this row has code AMOX and id paracetamol"
            ),
        ]
    );
    assert_eq!(find_item(&connection, "PARA"), paracetamol());
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn an_item_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = item_setup("central_data_item_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        item_sheet(vec![
            item_row([
                "", "BAD1", "Bad one", "", "", "", "", "0", "STOCK", "maybe", "TRUE", "-2", "", "",
                "-1", "",
            ]),
            // A cell that isn't a number is that error, not also "must be above 0".
            item_row([
                "", "BAD2", "Bad two", "", "", "", "", "abc", "STOCK", "TRUE", "FALSE", "", "", "",
                "-1", "",
            ]),
            // A blank key hides no other error.
            item_row([
                "",
                "",
                "Bad three",
                "",
                "",
                "",
                "",
                "0",
                "STOCK",
                "TRUE",
                "FALSE",
                "",
                "",
                "",
                "",
                "",
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("is_active"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            ),
            (
                2,
                Some("default_pack_size"),
                "default_pack_size must be above 0"
            ),
            (2, Some("vaccine_doses"), "vaccine_doses can't be negative"),
            (
                2,
                Some("volume_per_pack"),
                "volume_per_pack can't be negative"
            ),
            (3, Some("default_pack_size"), "\"abc\" must be a number"),
            (
                3,
                Some("volume_per_pack"),
                "volume_per_pack can't be negative"
            ),
            (4, Some("code"), "code is required for a new item"),
            (
                4,
                Some("default_pack_size"),
                "default_pack_size must be above 0"
            ),
        ]
    );
}

// covers: OMS-REG-CDIO-01.80

#[actix_rt::test]
async fn setting_an_item_inactive_counts_as_a_delete() {
    let (connection, service_provider, dir) = item_setup("central_data_item_deactivate").await;
    let ctx = service_provider.basic_context().unwrap();
    // The other columns are left out, so they keep their values.
    let bytes = sheet::write(vec![sheet_data(
        "item",
        &["code", "is_active"],
        vec![vec![Value::Text("PARA".to_string()), false.into()]],
    )])
    .unwrap();
    let path = write_file(dir.path(), bytes);

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 1);
    assert_eq!(summary.changes[0].change, Change::Deleted);
    assert_eq!(
        find_item(&connection, "PARA"),
        ItemRow {
            is_active: false,
            ..paracetamol()
        }
    );
}

// covers: OMS-REG-CDIO-01.24

#[actix_rt::test]
async fn a_shared_unit_name_location_type_code_or_item_code_asks_for_the_id() {
    let (connection, service_provider, dir) = item_setup("central_data_item_ambiguous").await;
    let ctx = service_provider.basic_context().unwrap();
    // Legacy data can hold duplicates the import would refuse.
    for id in ["bottle_a", "bottle_b"] {
        UnitRowRepository::new(&connection)
            .upsert_one(&bottle(id, true))
            .unwrap();
    }
    LocationTypeRowRepository::new(&connection)
        .upsert_one(&LocationTypeRow {
            id: "cold_copy".to_string(),
            code: "COLD".to_string(),
            name: "COLD".to_string(),
            ..Default::default()
        })
        .unwrap();
    ItemRowRepository::new(&connection)
        .upsert_one(&ItemRow {
            id: "paracetamol_copy".to_string(),
            ..paracetamol()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        item_sheet(vec![
            new_item("B", "Bottle", "", ""),
            new_item("C", "", "", "COLD"),
            item_with(&[(2, "Renamed")], "PARA"),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    let ambiguous = "ambiguous reference, please provide id instead";
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("unit_name"), ambiguous),
            (3, Some("restricted_location_type_code"), ambiguous),
            (4, Some("code"), ambiguous),
        ]
    );

    // The ids settle each one.
    let mut cold = new_item("C", "", "", "COLD");
    cold[13] = Value::Text("cold_copy".to_string());
    let mut renamed = item_named("paracetamol_copy", "PARA");
    renamed[2] = "Renamed";
    let path = write_file(
        dir.path(),
        item_sheet(vec![
            new_item("B", "Bottle", "bottle_b", ""),
            cold,
            item_row(renamed),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        find_item(&connection, "B").unit_id.as_deref(),
        Some("bottle_b")
    );
    assert_eq!(
        find_item(&connection, "C")
            .restricted_location_type_id
            .as_deref(),
        Some("cold_copy")
    );
    let item = |id: &str| {
        ItemRowRepository::new(&connection)
            .find_one_by_id(id)
            .unwrap()
            .unwrap()
    };
    assert_eq!(item("paracetamol_copy").name, "Renamed");
    assert_eq!(item("paracetamol"), paracetamol());
}

// covers: OMS-REG-CDIO-01.82

#[actix_rt::test]
async fn an_item_refers_to_a_unit_and_location_type_added_by_earlier_sheets() {
    let (connection, service_provider, dir) = item_setup("central_data_item_earlier_sheets").await;
    let ctx = service_provider.basic_context().unwrap();
    // The item sheet comes first in the workbook: the tables' order decides, not the sheets'.
    let bytes = sheet::write(vec![
        sheet_data(
            "item",
            &ITEM_HEADERS,
            vec![new_item("B", "Box", "", "WARM")],
        ),
        sheet_data(
            "unit",
            &["name", "index", "is_active"],
            vec![vec!["Box".to_string().into(), 2.into(), true.into()]],
        ),
        sheet_data(
            "location_type",
            &LOCATION_TYPE_HEADERS,
            vec![location_type_row(["", "WARM", "Warm", "25", "30", ""])],
        ),
    ])
    .unwrap();
    let path = write_file(dir.path(), bytes);

    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(summary.errors, vec![]);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let inserted: Vec<_> = summary
        .tables
        .iter()
        .map(|table| (table.table, table.inserted))
        .collect();
    assert_eq!(
        inserted,
        vec![
            (CentralDataTable::Unit, 1),
            (CentralDataTable::LocationType, 1),
            (CentralDataTable::Item, 1),
        ]
    );
    let unit = units_named(&connection, "Box").remove(0);
    let warm = LocationTypeRowRepository::new(&connection)
        .find_all()
        .unwrap()
        .into_iter()
        .find(|location_type| location_type.code == "WARM")
        .unwrap();
    let item = find_item(&connection, "B");
    assert_eq!(
        (item.unit_id, item.restricted_location_type_id),
        (Some(unit.id), Some(warm.id))
    );
}

// covers: OMS-REG-CDIO-01.83

#[actix_rt::test]
async fn blank_optional_item_cells_save_defaults() {
    let (connection, service_provider, dir) = item_setup("central_data_item_defaults").await;
    let ctx = service_provider.basic_context().unwrap();
    let plain = || {
        item_with(
            &[(2, "Plain"), (7, "1"), (8, "STOCK"), (9, "TRUE")],
            "PLAIN",
        )
    };
    let vaccine = |doses: &'static str| {
        item_with(
            &[
                (2, "Vaccine"),
                (7, "1"),
                (8, "STOCK"),
                (9, "TRUE"),
                (10, "TRUE"),
                (11, doses),
            ],
            "VAX",
        )
    };
    // A saved item's blank cells clear to the defaults too.
    let blank_para = || item_row(item_named("", "PARA"));

    let path = write_file(
        dir.path(),
        item_sheet(vec![plain(), vaccine(""), blank_para()]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            3,
            Some("vaccine_doses"),
            "vaccine_doses is required for a new vaccine"
        )]
    );

    let path = write_file(
        dir.path(),
        item_sheet(vec![plain(), vaccine("10"), blank_para()]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let defaults = |code: &str| {
        let item = find_item(&connection, code);
        (item.ven_category, item.vaccine_doses, item.volume_per_pack)
    };
    assert_eq!(defaults("PLAIN"), (VENCategory::NotAssigned, 0, 0.0));
    assert_eq!(defaults("VAX"), (VENCategory::NotAssigned, 10, 0.0));
    assert_eq!(defaults("PARA"), (VENCategory::NotAssigned, 0, 0.0));

    // A saved vaccine's blank cells keep it a vaccine with its doses.
    let path = write_file(
        dir.path(),
        item_sheet(vec![item_row(item_named("", "VAX"))]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(defaults("VAX"), (VENCategory::NotAssigned, 10, 0.0));
    assert!(find_item(&connection, "VAX").is_vaccine);
    assert!(!find_item(&connection, "PLAIN").is_vaccine);
}

// covers: OMS-REG-CDIO-01.87

#[actix_rt::test]
async fn a_saved_item_with_a_pack_size_of_0_can_be_renamed_but_not_given_one() {
    let (connection, service_provider, dir) = item_setup("central_data_item_legacy_pack").await;
    let ctx = service_provider.basic_context().unwrap();
    // Legacy data has items with a pack size of 0.
    let legacy = ItemRow {
        default_pack_size: 0.0,
        ..paracetamol()
    };
    ItemRowRepository::new(&connection)
        .upsert_one(&legacy)
        .unwrap();
    let sheet = |name: &str, default_pack_size: &str| {
        let cells = ["PARA", name, default_pack_size].map(|cell| match cell {
            "" => Value::Empty,
            cell => Value::Text(cell.to_string()),
        });
        let bytes = sheet::write(vec![sheet_data(
            "item",
            &["code", "name", "default_pack_size"],
            vec![cells.into()],
        )])
        .unwrap();
        write_file(dir.path(), bytes)
    };

    let summary = CentralDataService
        .import(
            &ctx,
            &sheet("Paracetamol tablets", "0"),
            &no_sessions(),
            today(),
        )
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        find_item(&connection, "PARA"),
        ItemRow {
            name: "Paracetamol tablets".to_string(),
            ..legacy
        }
    );

    let summary = CentralDataService
        .preview_import(&ctx, &sheet("", "-1"))
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("default_pack_size"),
            "default_pack_size must be above 0"
        )]
    );
}

// Users

const USER_HEADERS: [&str; 11] = [
    "id",
    "username",
    "password",
    "email",
    "language",
    "first_name",
    "last_name",
    "phone_number",
    "job_title",
    "is_active",
    "delete",
];

fn user_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![sheet_data("user", &USER_HEADERS, rows)]).unwrap()
}

/// A row of `USER_HEADERS` naming the user, with the given cells filled in by position.
fn user_row(id: &str, username: &str, cells: &[(usize, &str)]) -> Vec<Value> {
    let mut row = [""; 11];
    row[0] = id;
    row[1] = username;
    for (position, value) in cells {
        row[*position] = value;
    }
    row.into_iter()
        .map(|cell| match cell {
            "" => Value::Empty,
            cell => Value::Text(cell.to_string()),
        })
        .collect()
}

fn anna(hashed_password: &str) -> UserAccountRow {
    UserAccountRow {
        id: "anna".to_string(),
        username: "anna".to_string(),
        hashed_password: hashed_password.to_string(),
        email: Some("anna@example.org".to_string()),
        language: LanguageType::French,
        first_name: Some("Anna".to_string()),
        last_name: Some("Moreau".to_string()),
        phone_number: Some("007 123".to_string()),
        // Padded, as legacy sync can send it.
        job_title: Some(" Nurse".to_string()),
        last_successful_sync: Some(
            chrono::NaiveDate::from_ymd_opt(2026, 1, 2)
                .unwrap()
                .and_hms_opt(3, 4, 5)
                .unwrap(),
        ),
        is_active: true,
        deleted_datetime: None,
    }
}

fn ben() -> UserAccountRow {
    UserAccountRow {
        id: "ben".to_string(),
        username: "ben".to_string(),
        hashed_password: String::new(),
        is_active: false,
        ..Default::default()
    }
}

fn find_user(connection: &StorageConnection, id: &str) -> Option<UserAccountRow> {
    UserAccountRowRepository::new(connection)
        .find_one_by_id(id)
        .unwrap()
}

/// Anna, with password `secret` and access to store a, and Ben, inactive with no password, beside
/// the built-in users.
async fn user_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir, String) {
    let (_, connection, connection_manager, _) =
        setup_all(name, MockDataInserts::none().names().stores()).await;
    let hash = UserAccountService::hash_password("secret").unwrap();
    let repo = UserAccountRowRepository::new(&connection);
    repo.upsert_one(&anna(&hash)).unwrap();
    repo.upsert_one(&ben()).unwrap();
    UserStoreJoinRowRepository::new(&connection)
        .upsert_one(&UserStoreJoinRow {
            id: "anna_store_a".to_string(),
            user_id: "anna".to_string(),
            store_id: mock_store_a().id,
            is_default: true,
        })
        .unwrap();
    grant_server_admin(&connection, IMPORTER);
    (
        connection,
        ServiceProvider::new(connection_manager),
        TempDir::new().unwrap(),
        hash,
    )
}

/// Runs the user tests' imports and exports, as only a server admin may. Has no user row, so no
/// export lists them.
const IMPORTER: &str = "importer";

fn grant_server_admin(connection: &StorageConnection, user_id: &str) {
    UserPermissionRowRepository::new(connection)
        .upsert_one(&UserPermissionRow {
            id: format!("{user_id}_server_admin"),
            user_id: user_id.to_string(),
            store_id: Some(mock_store_a().id),
            permission: PermissionType::ServerAdmin,
            context_id: None,
        })
        .unwrap();
}

fn as_user(service_provider: &ServiceProvider, user_id: &str) -> ServiceContext {
    service_provider
        .context(String::new(), user_id.to_string())
        .unwrap()
}

fn all_users() -> ExportTable {
    ExportTable {
        table: CentralDataTable::User,
        filter: ExportFilter::default(),
    }
}

// covers: OMS-REG-CDIO-01.10, .11, .65, .90, .93

#[actix_rt::test]
async fn users_export_without_passwords_then_import_makes_no_changes() {
    let (connection, service_provider, dir, _) = user_setup("central_data_user_round_trip").await;
    // Sorted in any letter case, so after anna.
    UserAccountRowRepository::new(&connection)
        .upsert_one(&UserAccountRow {
            username: "Ben".to_string(),
            ..ben()
        })
        .unwrap();
    let before = UserAccountRowRepository::new(&connection)
        .find_all()
        .unwrap();
    let ctx = as_user(&service_provider, IMPORTER);

    let bytes = CentralDataService.export(&ctx, &[all_users()]).unwrap();
    let path = write_file(dir.path(), bytes);
    let exported = sheet::read(&path, MAX_IMPORT_ROWS)
        .ok()
        .unwrap()
        .pop()
        .unwrap();
    assert_eq!(exported.headers, USER_HEADERS);
    // Built-in users left out, and no password or hash.
    let cells: Vec<(&str, &str)> = exported
        .rows
        .iter()
        .map(|row| (row.cells[1].as_str(), row.cells[2].as_str()))
        .collect();
    assert_eq!(cells, [("anna", ""), ("Ben", "")]);

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 2);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        UserAccountRowRepository::new(&connection)
            .find_all()
            .unwrap(),
        before
    );
}

// covers: OMS-REG-CDIO-01.46, .47, .90

#[actix_rt::test]
async fn a_user_export_searches_usernames_and_filters_by_status() {
    let (_, service_provider, _, _) = user_setup("central_data_user_filter").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let counts = |contains: Option<&str>, is_active: Option<bool>| {
        let table = ExportTable {
            table: CentralDataTable::User,
            filter: ExportFilter {
                contains: contains.map(str::to_string),
                is_active,
            },
        };
        CentralDataService.export_counts(&ctx, &[table]).unwrap()[0].count
    };

    // The built-in users aren't counted.
    assert_eq!(
        counts(None, None),
        RecordCount {
            matching: 2,
            total: 2
        }
    );
    assert_eq!(counts(Some(" ANN "), None).matching, 1);
    assert_eq!(counts(Some("omsupply"), None).matching, 0);
    assert_eq!(counts(None, Some(false)).matching, 1);
}

// covers: OMS-REG-CDIO-01.12, .37, .58, .63, .87, .93, .94, .97, .211

#[actix_rt::test]
async fn user_rows_add_and_update_by_username_and_hash_passwords() {
    let (connection, service_provider, dir, hash) = user_setup("central_data_user_upsert").await;
    let ctx = as_user(&service_provider, IMPORTER);

    let path = write_file(
        dir.path(),
        user_sheet(vec![
            user_row("", "dan", &[(3, "dan@example.org")]),
            user_row("", "", &[(2, "pw")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("password"), "password is required for a new user"),
            (
                2,
                Some("language"),
                "language is required for a new user and must be one of ENGLISH, FRENCH, SPANISH, LAOS, KHMER, PORTUGUESE, RUSSIAN, TETUM"
            ),
            (3, Some("username"), "username is required for a new user"),
            (
                3,
                Some("language"),
                "language is required for a new user and must be one of ENGLISH, FRENCH, SPANISH, LAOS, KHMER, PORTUGUESE, RUSSIAN, TETUM"
            ),
        ]
    );

    let path = write_file(
        dir.path(),
        user_sheet(vec![
            // Any letter case for a choice; a blank is_active makes an active user.
            user_row("", "cara", &[(2, "pw1"), (4, "spanish")]),
            // A blank password and language keep them; making a user inactive is an update.
            user_row("", "anna", &[(8, "Pharmacist"), (9, "FALSE")]),
            // Ben had no password.
            user_row("ben", "ben", &[(2, "pw2")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    // Anna made inactive and Ben given a password; Cara is new, with no session yet.
    assert_eq!(ending_sessions(&summary), ["anna", "ben"]);
    let changes: Vec<_> = summary
        .changes
        .iter()
        .map(|change| (change.record.as_str(), change.change))
        .collect();
    assert_eq!(
        changes,
        [
            ("cara", Change::Inserted),
            ("anna", Change::Updated),
            ("ben", Change::Updated),
        ]
    );
    let field = |column, from: &str, to: &str| FieldChange {
        column,
        from: from.to_string(),
        to: to.to_string(),
    };
    assert_eq!(
        summary.changes[1].fields,
        vec![
            // The optional columns were blank, so they're cleared.
            field("email", "anna@example.org", ""),
            field("first_name", "Anna", ""),
            field("last_name", "Moreau", ""),
            field("phone_number", "007 123", ""),
            field("job_title", " Nurse", "Pharmacist"),
            field("is_active", "TRUE", "FALSE"),
        ]
    );
    assert_eq!(
        summary.changes[2].fields,
        vec![field("password", "", "changed")]
    );

    let cara = UserAccountRowRepository::new(&connection)
        .find_one_by_user_name("cara")
        .unwrap()
        .unwrap();
    assert_eq!(
        (cara.language, cara.is_active),
        (LanguageType::Spanish, true)
    );
    assert!(bcrypt::verify("pw1", &cara.hashed_password).unwrap());
    let users = UserAccountService::new(&connection);
    assert!(users.verify_password("cara", "pw1").is_ok());
    assert!(
        users.verify_password("ben", "pw2").is_err(),
        "ben is inactive"
    );
    assert!(
        users.verify_password("anna", "secret").is_err(),
        "anna is now inactive"
    );
    assert_eq!(
        find_user(&connection, "anna"),
        Some(UserAccountRow {
            email: None,
            first_name: None,
            last_name: None,
            phone_number: None,
            job_title: Some("Pharmacist".to_string()),
            is_active: false,
            ..anna(&hash)
        })
    );

    // A preview doesn't check passwords, so it counts the saved one as a change; the import
    // checks it, and it changes nothing. Another one replaces it.
    let path = write_file(
        dir.path(),
        user_sheet(vec![user_row("", "cara", &[(2, "pw1")])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        summary.changes[0].fields,
        vec![field("password", "******", "changed")]
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.tables[0].unchanged, 1);
    let path = write_file(
        dir.path(),
        user_sheet(vec![user_row("", "cara", &[(2, "pw3")])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        summary.changes[0].fields,
        vec![field("password", "******", "changed")]
    );
    assert!(users.verify_password("cara", "pw3").is_ok());
}

// covers: OMS-REG-CDIO-01.93

#[actix_rt::test]
async fn users_sharing_a_password_get_their_own_hash() {
    let (connection, service_provider, dir, _) = user_setup("central_data_user_salts").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let new = |username, password| user_row("", username, &[(2, password), (4, "ENGLISH")]);

    // Eve's surrounding spaces are dropped, as every cell's are.
    let path = write_file(
        dir.path(),
        user_sheet(vec![new("dan", "changeme"), new("eve", " changeme ")]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.tables[0].inserted, 2);

    let repo = UserAccountRowRepository::new(&connection);
    let hash = |username| {
        repo.find_one_by_user_name(username)
            .unwrap()
            .unwrap()
            .hashed_password
    };
    assert_ne!(hash("dan"), hash("eve"));
    let users = UserAccountService::new(&connection);
    assert!(users.verify_password("dan", "changeme").is_ok());
    assert!(users.verify_password("eve", "changeme").is_ok());
}

/// Anna, running the import from one of her two sessions, and Ben each get a new password, then
/// Anna logs in again somewhere. Returns whether each session is still open afterwards: Anna's
/// here and elsewhere, Ben's, and the importer's, whom the import doesn't change.
async fn sessions_after_new_passwords(name: &str, extra_rows: Vec<Vec<Value>>) -> [bool; 4] {
    let (connection, service_provider, dir, _) = user_setup(name).await;
    grant_server_admin(&connection, "anna");
    let ctx = as_user(&service_provider, "anna");
    let store: Arc<RwLock<SessionStore>> = Default::default();
    let anna_hash = || find_user(&connection, "anna").unwrap().hashed_password;
    let tokens = {
        let mut sessions = store.write().unwrap();
        // As her login records it.
        sessions.revoke_if_credentials_changed("anna", &anna_hash());
        ["anna", "anna", "ben", IMPORTER].map(|user_id| sessions.create(user_id))
    };
    let mut rows = vec![
        user_row("", "anna", &[(2, "new secret")]),
        user_row("", "ben", &[(2, "pw2")]),
    ];
    rows.extend(extra_rows);

    let path = write_file(dir.path(), user_sheet(rows));
    let sessions = OpenSessions {
        store: store.clone(),
        keep: Some(tokens[0].clone()),
    };
    CentralDataService
        .import(&ctx, &path, &sessions, today())
        .unwrap();
    let mut store = store.write().unwrap();
    store.revoke_if_credentials_changed("anna", &anna_hash());
    tokens.map(|token| store.validate_and_slide(&token).is_some())
}

// covers: OMS-REG-CDIO-01.92

#[actix_rt::test]
async fn a_new_password_ends_the_users_sessions_but_not_the_importers_own() {
    // The importer's own session outlives their next login with the new password too.
    let [anna_here, anna_elsewhere, ben, importer] =
        sessions_after_new_passwords("central_data_user_sessions_end", vec![]).await;
    assert!(anna_here);
    assert!(!anna_elsewhere);
    assert!(!ben);
    assert!(importer);
}

#[actix_rt::test]
async fn an_import_with_errors_ends_no_sessions() {
    // No username, so nothing is applied.
    let no_username = user_row("", "", &[(2, "pw")]);
    let open =
        sessions_after_new_passwords("central_data_user_sessions_kept", vec![no_username]).await;
    assert_eq!(open, [true; 4]);
}

// covers: OMS-REG-CDIO-01.39, .51, .73, .95

#[actix_rt::test]
async fn a_username_finds_its_user_in_any_case_and_is_not_changed_or_taken() {
    let (connection, service_provider, dir, _) = user_setup("central_data_user_username").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let new = [(2, "pw"), (4, "ENGLISH")];

    let path = write_file(
        dir.path(),
        user_sheet(vec![
            user_row("anna", "annie", &[]),
            user_row("new_id", "ANNA", &new),
            // A new id beside a username row 4 adds, in another letter case.
            user_row("dan_1", "Dan", &new),
            user_row("dan_2", "DAN", &new),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("username"),
                "username and id conflict: anna has username anna and id anna, but this row has username annie and id anna"
            ),
            (
                3,
                Some("username"),
                "username and id conflict: anna has username anna and id anna, but this row has username ANNA and id new_id"
            ),
            (
                5,
                Some("username"),
                "username and id conflict: Dan has username Dan and id dan_1, but this row has username DAN and id dan_2"
            ),
        ]
    );

    // As login does; the saved username keeps its letter case.
    let path = write_file(
        dir.path(),
        user_sheet(vec![
            user_row("", "ANNA", &[(8, "Pharmacist")]),
            user_row("", "Cara", &new),
            // Finds Cara, added above, and changes nothing.
            user_row("", "cara", &new),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let changes: Vec<_> = summary
        .changes
        .iter()
        .map(|change| (change.record.as_str(), change.change))
        .collect();
    assert_eq!(
        changes,
        [("anna", Change::Updated), ("Cara", Change::Inserted)]
    );
    assert_eq!(summary.tables[0].unchanged, 1);
    let anna = find_user(&connection, "anna").unwrap();
    assert_eq!(
        (anna.username.as_str(), anna.job_title.as_deref()),
        ("anna", Some("Pharmacist"))
    );
}

// covers: OMS-REG-CDIO-01.88, .89

#[actix_rt::test]
async fn a_deleted_user_keeps_their_store_access_but_cannot_log_in() {
    let (connection, service_provider, dir, hash) = user_setup("central_data_user_delete").await;
    let ctx = as_user(&service_provider, IMPORTER);
    // As exported, so the saved values are no change.
    let delete_anna = || {
        user_row(
            "anna",
            "anna",
            &[(4, "FRENCH"), (8, "Nurse"), (9, "TRUE"), (10, "DELETE")],
        )
    };

    let path = write_file(dir.path(), user_sheet(vec![delete_anna()]));
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 1);
    assert_eq!(summary.changes[0].change, Change::Deleted);
    assert_eq!(ending_sessions(&summary), ["anna"]);

    // Kept, with their store access, but can't log in.
    let anna_now = find_user(&connection, "anna").unwrap();
    assert!(anna_now.deleted_datetime.is_some());
    assert_eq!(
        anna_now,
        UserAccountRow {
            deleted_datetime: anna_now.deleted_datetime,
            ..anna(&hash)
        }
    );
    assert_eq!(
        UserStoreJoinRowRepository::new(&connection)
            .find_many_by_user_id("anna")
            .unwrap()
            .len(),
        1
    );
    assert!(
        UserAccountService::new(&connection)
            .verify_password("anna", "secret")
            .is_err()
    );

    // Left out of an export, and deleting them again changes nothing.
    let exported = CentralDataService
        .export_counts(&ctx, &[all_users()])
        .unwrap();
    assert_eq!(exported[0].count.total, 1, "only ben");
    let path = write_file(dir.path(), user_sheet(vec![delete_anna()]));
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 0);
    assert_eq!(summary.tables[0].unchanged, 1);
    assert_eq!(find_user(&connection, "anna"), Some(anna_now));
}

// covers: OMS-REG-CDIO-01.96

#[actix_rt::test]
async fn a_row_without_delete_restores_a_deleted_user() {
    let (connection, service_provider, dir, hash) = user_setup("central_data_user_restore").await;
    let ctx = as_user(&service_provider, IMPORTER);
    UserAccountRowRepository::new(&connection)
        .upsert_one(&UserAccountRow {
            deleted_datetime: Some(chrono::Utc::now().naive_utc()),
            ..anna(&hash)
        })
        .unwrap();

    // By username in another case, with a change of job title.
    let path = write_file(
        dir.path(),
        user_sheet(vec![user_row(
            "",
            "ANNA",
            &[
                (3, "anna@example.org"),
                (5, "Anna"),
                (6, "Moreau"),
                (7, "007 123"),
                (8, "Pharmacist"),
            ],
        )]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].updated, 1);
    assert_eq!(summary.changes[0].change, Change::Restored);
    assert_eq!(
        summary.changes[0]
            .fields
            .iter()
            .map(|field| (field.column, field.from.as_str(), field.to.as_str()))
            .collect::<Vec<_>>(),
        [
            ("job_title", " Nurse", "Pharmacist"),
            ("delete", "DELETE", "")
        ]
    );
    assert_eq!(
        find_user(&connection, "anna"),
        Some(UserAccountRow {
            job_title: Some("Pharmacist".to_string()),
            ..anna(&hash)
        })
    );
    assert!(
        UserAccountService::new(&connection)
            .verify_password("anna", "secret")
            .is_ok()
    );
}

// covers: OMS-REG-CDIO-01.90

#[actix_rt::test]
async fn a_row_cannot_change_or_take_a_protected_user() {
    let (connection, service_provider, dir, _) = user_setup("central_data_user_protected").await;
    let ctx = as_user(&service_provider, IMPORTER);
    // Ben is the admin this server made at setup.
    KeyValueStoreRepository::new(&connection)
        .set_string(
            KeyType::StandaloneCentralAdminUserId,
            Some("ben".to_string()),
        )
        .unwrap();
    // A protected user whose row is missing still can't be made.
    UserAccountRowRepository::new(&connection)
        .delete_by_id(PLUGIN_USER_ID)
        .unwrap();
    let before = UserAccountRowRepository::new(&connection)
        .find_all()
        .unwrap();

    let exported = CentralDataService
        .export_counts(&ctx, &[all_users()])
        .unwrap();
    assert_eq!(exported[0].count.total, 1, "only anna");

    let path = write_file(
        dir.path(),
        user_sheet(vec![
            user_row("", SYSTEM_USER_ID, &[(2, "pw")]),
            user_row(PLUGIN_USER_ID, "", &[(9, "FALSE")]),
            user_row("", "OMSUPPLY_SYSTEM", &[(2, "pw"), (4, "ENGLISH")]),
            user_row("", "ben", &[(2, "pw")]),
            user_row("", "ben", &[(10, "DELETE")]),
            user_row(SYSTEM_USER_ID, "", &[(8, "Pharmacist")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let protected = |username: &str| {
        format!("{username} is protected, as the server needs it, so import can't change it")
    };
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("username"), protected("omsupply_system").as_str()),
            (3, Some("id"), protected("omsupply_plugin").as_str()),
            (4, Some("username"), protected("omsupply_system").as_str()),
            (5, Some("username"), protected("ben").as_str()),
            (6, Some("username"), protected("ben").as_str()),
            (7, Some("id"), protected("omsupply_system").as_str()),
        ]
    );
    assert_eq!(
        UserAccountRowRepository::new(&connection)
            .find_all()
            .unwrap(),
        before
    );
}

// covers: OMS-REG-CDIO-01.91

#[actix_rt::test]
async fn the_importing_user_cannot_delete_themselves_or_make_themselves_inactive() {
    let (connection, service_provider, dir, hash) = user_setup("central_data_user_importer").await;
    // Anna, a server admin, runs the import.
    grant_server_admin(&connection, "anna");
    let ctx = as_user(&service_provider, "anna");

    let path = write_file(
        dir.path(),
        user_sheet(vec![
            user_row("", "anna", &[(9, "FALSE")]),
            user_row("", "anna", &[(10, "DELETE")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("is_active"),
                "This is you. You can't make yourself inactive, or you couldn't log in again"
            ),
            (
                3,
                Some("delete"),
                "This is you. You can't delete yourself, or you couldn't log in again"
            ),
        ]
    );

    // Their own password they may change.
    let path = write_file(
        dir.path(),
        user_sheet(vec![user_row("", "anna", &[(2, "new secret")])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].updated, 1);
    assert_ne!(
        find_user(&connection, "anna").unwrap().hashed_password,
        hash
    );
    assert!(
        UserAccountService::new(&connection)
            .verify_password("anna", "new secret")
            .is_ok()
    );
}

// covers: OMS-REG-CDIO-01.99

#[actix_rt::test]
async fn only_a_server_admin_can_import_or_export_users() {
    let (connection, service_provider, dir, _) = user_setup("central_data_user_admin_only").await;
    // Anna can import and export central data, but isn't a server admin.
    let ctx = as_user(&service_provider, "anna");
    let before = UserAccountRowRepository::new(&connection)
        .find_all()
        .unwrap();

    assert!(matches!(
        CentralDataService.export(&ctx, &[all_users()]),
        Err(ExportError::ServerAdminOnly)
    ));
    assert!(matches!(
        CentralDataService.export_counts(&ctx, &[all_units(), all_users()]),
        Err(ExportError::ServerAdminOnly)
    ));
    // Other tables she still can.
    assert!(CentralDataService.export(&ctx, &[all_units()]).is_ok());

    // A new password for Ben, and a row that would otherwise be a conflict naming Anna's id.
    let users = sheet_data(
        "user",
        &USER_HEADERS,
        vec![
            user_row("", "ben", &[(2, "taken over")]),
            user_row("new_id", "anna", &[]),
        ],
    );
    let units = sheet_data(
        "unit",
        &["name", "index", "is_active"],
        vec![vec![Value::Text("Vial".to_string()), 9.into(), true.into()]],
    );
    let path = write_file(dir.path(), sheet::write(vec![units, users]).unwrap());
    for summary in [
        CentralDataService.preview_import(&ctx, &path).unwrap(),
        CentralDataService
            .import(&ctx, &path, &no_sessions(), today())
            .unwrap(),
    ] {
        let errors: Vec<_> = summary
            .errors
            .iter()
            .map(|error| (error.sheet.as_str(), error.row, error.message.as_str()))
            .collect();
        assert_eq!(
            errors,
            [("user", None, "Only a server admin can import this sheet")]
        );
        // Its rows don't run, but it's listed with its error.
        let tables: Vec<_> = summary
            .tables
            .iter()
            .map(|changes| (changes.table, changes.error_count, changes.unchanged))
            .collect();
        assert_eq!(
            tables,
            [
                (CentralDataTable::Unit, 0, 0),
                (CentralDataTable::User, 1, 0)
            ]
        );
    }
    // With an error nothing is applied, the unit included.
    assert_eq!(
        UserAccountRowRepository::new(&connection)
            .find_all()
            .unwrap(),
        before
    );
    assert!(units_named(&connection, "Vial").is_empty());

    // As a server admin, the rows run.
    grant_server_admin(&connection, "anna");
    assert!(CentralDataService.export(&ctx, &[all_users()]).is_ok());
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    let rows: Vec<_> = summary.errors.iter().map(|error| error.row).collect();
    assert_eq!(rows, [Some(3)], "only the conflict");
}

// Master lists

const MASTER_LIST_HEADERS: [&str; 7] = [
    "id",
    "code",
    "name",
    "description",
    "is_active",
    "is_default_price_list",
    "discount_percentage",
];

fn master_list_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![sheet_data("master_list", &MASTER_LIST_HEADERS, rows)]).unwrap()
}

/// One row of `MASTER_LIST_HEADERS`; blank cells are `""`.
fn master_list_row(cells: [&str; 7]) -> Vec<Value> {
    cells
        .into_iter()
        .map(|cell| match cell {
            "" => Value::Empty,
            cell => Value::Text(cell.to_string()),
        })
        .collect()
}

fn essential_medicines() -> MasterListRow {
    MasterListRow {
        id: "eml".to_string(),
        code: "EML".to_string(),
        name: "Essential medicines".to_string(),
        description: "WHO list".to_string(),
        is_active: true,
        is_default_price_list: true,
        discount_percentage: Some(12.5),
    }
}

fn find_master_list(connection: &StorageConnection, id: &str) -> Option<MasterListRow> {
    MasterListRowRepository::new(connection)
        .find_one_by_id(id)
        .unwrap()
}

fn all_master_lists() -> ExportTable {
    ExportTable {
        table: CentralDataTable::MasterList,
        filter: ExportFilter::default(),
    }
}

async fn master_list_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (_, connection, connection_manager, _) = setup_all(name, MockDataInserts::none()).await;
    MasterListRowRepository::new(&connection)
        .upsert_one(&essential_medicines())
        .unwrap();
    (
        connection,
        ServiceProvider::new(connection_manager),
        TempDir::new().unwrap(),
    )
}

// covers: OMS-REG-CDIO-01.10, .11, .22, .65

#[actix_rt::test]
async fn master_lists_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_round_trip").await;
    // Leading zeros, padded text, no description or discount and inactive must survive.
    MasterListRowRepository::new(&connection)
        .upsert_one(&MasterListRow {
            id: "old".to_string(),
            code: "007".to_string(),
            name: "Old list ".to_string(),
            description: String::new(),
            is_active: false,
            is_default_price_list: false,
            discount_percentage: None,
        })
        .unwrap();
    let before = MasterListRowRepository::new(&connection)
        .find_all()
        .unwrap();
    let ctx = service_provider.basic_context().unwrap();

    let bytes = CentralDataService
        .export(&ctx, &[all_master_lists()])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();

    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 2);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        MasterListRowRepository::new(&connection)
            .find_all()
            .unwrap(),
        before
    );
}

// covers: OMS-REG-CDIO-01.46, .47

#[actix_rt::test]
async fn a_master_list_export_searches_code_and_name_and_filters_by_status() {
    let (connection, service_provider, _) =
        master_list_setup("central_data_master_list_filter").await;
    MasterListRowRepository::new(&connection)
        .upsert_one(&MasterListRow {
            id: "hiv".to_string(),
            code: "ARV".to_string(),
            name: "HIV program".to_string(),
            is_active: false,
            ..Default::default()
        })
        .unwrap();
    let ctx = service_provider.basic_context().unwrap();
    let matching = |contains: Option<&str>, is_active: Option<bool>| {
        let table = ExportTable {
            table: CentralDataTable::MasterList,
            filter: ExportFilter {
                contains: contains.map(str::to_string),
                is_active,
            },
        };
        let count = CentralDataService.export_counts(&ctx, &[table]).unwrap()[0].count;
        assert_eq!(count.total, 2);
        count.matching
    };

    assert_eq!(matching(Some(" essential "), None), 1);
    assert_eq!(matching(Some("arv"), None), 1);
    assert_eq!(matching(None, Some(false)), 1);
    assert_eq!(matching(Some("essential"), Some(false)), 0);
    assert_eq!(matching(Some(""), None), 2);
}

// covers: OMS-REG-CDIO-01.12, .27, .35, .58, .63, .76, .120

#[actix_rt::test]
async fn master_list_rows_add_and_update_by_name() {
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_upsert").await;
    let ctx = service_provider.basic_context().unwrap();
    // No code needed.
    let new_list = ["", "", "HIV program", "", "TRUE", "0", "5"];
    // Found by name; blank required cells keep their values, blank optional ones clear them.
    let edited = ["", "EML", "Essential medicines", "", "", "", ""];

    let path = write_file(
        dir.path(),
        master_list_sheet(vec![
            master_list_row(new_list),
            master_list_row(edited),
            master_list_row(["", "", "", "", "yes", "", "ten"]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (4, Some("is_active"), "\"yes\" must be TRUE, FALSE, 1 or 0"),
            (4, Some("discount_percentage"), "\"ten\" must be a number"),
            (4, Some("name"), "name is required for a new master list"),
            (
                4,
                Some("is_default_price_list"),
                "is_default_price_list is required for a new master list"
            ),
        ]
    );
    assert_eq!(
        find_master_list(&connection, "eml"),
        Some(essential_medicines())
    );

    let path = write_file(
        dir.path(),
        master_list_sheet(vec![master_list_row(new_list), master_list_row(edited)]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].updated),
        (1, 1)
    );
    assert_eq!(summary.changes[0].record, "HIV program");
    assert_eq!(
        summary.changes[1].fields,
        vec![
            FieldChange {
                column: "description",
                from: "WHO list".to_string(),
                to: String::new(),
            },
            FieldChange {
                column: "discount_percentage",
                from: "12.5".to_string(),
                to: String::new(),
            },
        ]
    );
    assert_eq!(
        find_master_list(&connection, "eml"),
        Some(MasterListRow {
            description: String::new(),
            discount_percentage: None,
            ..essential_medicines()
        })
    );
    let added = MasterListRowRepository::new(&connection)
        .find_by_trimmed_name("HIV program")
        .unwrap()
        .remove(0);
    assert_eq!(
        added,
        MasterListRow {
            id: added.id.clone(),
            code: String::new(),
            name: "HIV program".to_string(),
            description: String::new(),
            is_active: true,
            is_default_price_list: false,
            discount_percentage: Some(5.0),
        }
    );
}

// covers: OMS-REG-CDIO-01.74, .122

#[actix_rt::test]
async fn a_master_list_is_renamed_by_its_id_but_no_name_or_code_is_taken() {
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_conflicts").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        master_list_sheet(vec![
            master_list_row(["hiv", "HIV", "HIV program", "", "TRUE", "FALSE", ""]),
            // A new active list named as one added earlier in the file, then as a saved one.
            master_list_row(["copy_id", "", "HIV program", "", "TRUE", "FALSE", ""]),
            master_list_row(["new_id", "", "Essential medicines", "", "TRUE", "FALSE", ""]),
            // Renamed to another list's name, then a new list with another list's code.
            master_list_row(["eml", "EML", "HIV program", "", "", "", ""]),
            master_list_row(["", "HIV", "Clinic", "", "TRUE", "FALSE", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                3,
                Some("name"),
                "Master list hiv is already named HIV program. Give this master list another name, or make one of them inactive"
            ),
            (
                4,
                Some("name"),
                "Master list eml is already named Essential medicines. Give this master list another name, or make one of them inactive"
            ),
            (
                5,
                Some("name"),
                "Master list hiv is already named HIV program. Give this master list another name, or make one of them inactive"
            ),
            (6, Some("code"), "Master list hiv already has code HIV"),
        ]
    );
    assert_eq!(
        find_master_list(&connection, "eml"),
        Some(essential_medicines())
    );
    assert_eq!(find_master_list(&connection, "hiv"), None);

    // With its id, a new name renames it.
    let path = write_file(
        dir.path(),
        master_list_sheet(vec![master_list_row([
            "eml",
            "EML",
            "Essential medicines 2026",
            "",
            "",
            "",
            "12.5",
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].updated, 1);
    assert_eq!(
        find_master_list(&connection, "eml").map(|master_list| master_list.name),
        Some("Essential medicines 2026".to_string())
    );
}

// covers: OMS-REG-CDIO-01.124

#[actix_rt::test]
async fn an_inactive_master_list_does_not_hold_on_to_its_name() {
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_inactive_name").await;
    // An old list with the name of the saved active one.
    MasterListRowRepository::new(&connection)
        .upsert_one(&MasterListRow {
            id: "old_eml".to_string(),
            code: String::new(),
            is_active: false,
            is_default_price_list: false,
            ..essential_medicines()
        })
        .unwrap();
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        master_list_sheet(vec![
            // Without an id, the name finds the active list, not the inactive one.
            master_list_row(["", "", "Essential medicines", "Changed", "", "", ""]),
            // A new id with an inactive list's name adds a list, which can be inactive too.
            master_list_row([
                "older_eml",
                "",
                "Essential medicines",
                "",
                "FALSE",
                "FALSE",
                "",
            ]),
            // Making the old one active would leave two active lists with one name.
            master_list_row(["old_eml", "", "", "", "TRUE", "", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            4,
            Some("name"),
            "Master list eml is already named Essential medicines. Give this master list another name, or make one of them inactive"
        )]
    );

    let path = write_file(
        dir.path(),
        master_list_sheet(vec![
            master_list_row(["", "", "Essential medicines", "Changed", "", "", ""]),
            master_list_row([
                "older_eml",
                "",
                "Essential medicines",
                "",
                "FALSE",
                "FALSE",
                "",
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].updated),
        (1, 1)
    );
    assert_eq!(
        find_master_list(&connection, "eml").map(|master_list| master_list.description),
        Some("Changed".to_string())
    );
    assert!(find_master_list(&connection, "older_eml").is_some());
}

// covers: OMS-REG-CDIO-01.209

#[actix_rt::test]
async fn a_master_list_sheet_leaves_at_most_one_default_price_list() {
    // Essential medicines is the default price list.
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_default_price_list").await;
    let ctx = service_provider.basic_context().unwrap();
    let hiv = ["hiv", "", "HIV program", "", "TRUE", "TRUE", ""];
    let clinic = ["clinic", "", "Clinic", "", "FALSE", "TRUE", ""];

    // A new default beside the saved one, active or not, is an error on each row that made one.
    let path = write_file(
        dir.path(),
        master_list_sheet(vec![master_list_row(hiv), master_list_row(clinic)]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("is_default_price_list"),
                "HIV program would be the default price list, and so would Clinic and Essential medicines, but there can be only one. Set is_default_price_list to FALSE for all but one"
            ),
            (
                3,
                Some("is_default_price_list"),
                "Clinic would be the default price list, and so would Essential medicines and HIV program, but there can be only one. Set is_default_price_list to FALSE for all but one"
            ),
        ]
    );

    // Moving the default to another list imports in either row order.
    let take_default = ["eml", "", "", "", "", "FALSE", ""];
    for rows in [[hiv, take_default], [take_default, hiv]] {
        let path = write_file(
            dir.path(),
            master_list_sheet(rows.into_iter().map(master_list_row).collect()),
        );
        let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
        assert_eq!(summary.errors, vec![]);
    }
    let path = write_file(
        dir.path(),
        master_list_sheet(vec![master_list_row(hiv), master_list_row(take_default)]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert!(
        find_master_list(&connection, "hiv")
            .unwrap()
            .is_default_price_list
    );
    assert!(
        !find_master_list(&connection, "eml")
            .unwrap()
            .is_default_price_list
    );

    // No default price list is fine.
    let path = write_file(
        dir.path(),
        master_list_sheet(vec![master_list_row(["hiv", "", "", "", "", "FALSE", ""])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);

    // Lists that already share it must be put right in the same sheet, even by a row that doesn't
    // touch them: no row is to blame, so the sheet gets the error.
    let repo = MasterListRowRepository::new(&connection);
    for id in ["eml", "hiv"] {
        repo.upsert_one(&MasterListRow {
            is_default_price_list: true,
            ..find_master_list(&connection, id).unwrap()
        })
        .unwrap();
    }
    let path = write_file(
        dir.path(),
        master_list_sheet(vec![master_list_row([
            "eml", "", "", "Changed", "", "", "",
        ])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        summary.errors,
        vec![RowError {
            sheet: "master_list".to_string(),
            row: None,
            column: Some("is_default_price_list".to_string()),
            message: "Essential medicines and HIV program are each the default price list, but there can be only one. Set is_default_price_list to FALSE for all but one".to_string(),
        }]
    );
}

// covers: OMS-REG-CDIO-01.210

#[actix_rt::test]
async fn a_master_list_discount_is_from_0_to_100() {
    // Essential medicines gives 12.5%.
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_discount").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        master_list_sheet(vec![
            master_list_row(["eml", "", "", "", "", "", "-1"]),
            master_list_row(["", "", "HIV program", "", "TRUE", "FALSE", "100.5"]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("discount_percentage"),
                "discount_percentage must be from 0 to 100"
            ),
            (
                3,
                Some("discount_percentage"),
                "discount_percentage must be from 0 to 100"
            ),
        ]
    );

    let path = write_file(
        dir.path(),
        master_list_sheet(vec![
            master_list_row(["eml", "", "", "", "", "", "0"]),
            master_list_row(["", "", "HIV program", "", "TRUE", "FALSE", "100"]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        find_master_list(&connection, "eml")
            .unwrap()
            .discount_percentage,
        Some(0.0)
    );

    // A saved discount out of range stays editable while the row leaves it as it is.
    MasterListRowRepository::new(&connection)
        .upsert_one(&MasterListRow {
            discount_percentage: Some(150.0),
            ..essential_medicines()
        })
        .unwrap();
    let path = write_file(
        dir.path(),
        master_list_sheet(vec![master_list_row([
            "eml", "", "", "Changed", "", "", "150",
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
}

// covers: OMS-REG-CDIO-01.123

#[actix_rt::test]
async fn a_master_list_without_a_code_is_edited_and_can_be_given_one() {
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_no_code").await;
    // As legacy mSupply sends them.
    let repo = MasterListRowRepository::new(&connection);
    let no_code = |id: &str, name: &str| MasterListRow {
        id: id.to_string(),
        name: name.to_string(),
        is_active: true,
        ..Default::default()
    };
    repo.upsert_one(&no_code("health_centre", "Health Centre"))
        .unwrap();
    repo.upsert_one(&no_code("hospital", "Hospital")).unwrap();
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        master_list_sheet(vec![
            master_list_row(["", "", "Health Centre", "Clinics", "", "", ""]),
            master_list_row(["hospital", "HOSP", "Hospital", "", "", "", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].updated, 2);
    assert_eq!(
        find_master_list(&connection, "health_centre"),
        Some(MasterListRow {
            description: "Clinics".to_string(),
            ..no_code("health_centre", "Health Centre")
        })
    );
    assert_eq!(
        find_master_list(&connection, "hospital"),
        Some(MasterListRow {
            code: "HOSP".to_string(),
            ..no_code("hospital", "Hospital")
        })
    );
}

// covers: OMS-REG-CDIO-01.121

#[actix_rt::test]
async fn setting_a_master_list_inactive_counts_as_a_delete() {
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_deactivate").await;
    let ctx = service_provider.basic_context().unwrap();
    // The other columns are left out, so they keep their values.
    let bytes = sheet::write(vec![sheet_data(
        "master_list",
        &["name", "is_active"],
        vec![vec![
            Value::Text("Essential medicines".to_string()),
            false.into(),
        ]],
    )])
    .unwrap();
    let path = write_file(dir.path(), bytes);

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 1);
    assert_eq!(summary.changes[0].change, Change::Deleted);
    assert_eq!(
        find_master_list(&connection, "eml"),
        Some(MasterListRow {
            is_active: false,
            ..essential_medicines()
        })
    );
}

// covers: OMS-REG-CDIO-01.24

#[actix_rt::test]
async fn a_shared_master_list_name_asks_for_the_id() {
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_ambiguous").await;
    let ctx = service_provider.basic_context().unwrap();
    // Legacy data can hold duplicates the import would refuse.
    MasterListRowRepository::new(&connection)
        .upsert_one(&MasterListRow {
            id: "eml_copy".to_string(),
            is_default_price_list: false,
            ..essential_medicines()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        master_list_sheet(vec![master_list_row([
            "",
            "EML",
            "Essential medicines",
            "Changed",
            "",
            "",
            "",
        ])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("name"),
            "ambiguous reference, please provide id instead"
        )]
    );

    // The id settles it.
    let path = write_file(
        dir.path(),
        master_list_sheet(vec![master_list_row([
            "eml_copy",
            "EML",
            "Essential medicines",
            "Changed",
            "",
            "",
            "12.5",
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        find_master_list(&connection, "eml_copy").map(|master_list| master_list.description),
        Some("Changed".to_string())
    );
    assert_eq!(
        find_master_list(&connection, "eml"),
        Some(essential_medicines())
    );
}

// covers: OMS-REG-CDIO-01.125

#[actix_rt::test]
async fn the_missing_program_master_list_is_not_exported_or_imported() {
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_protected").await;
    let ctx = service_provider.basic_context().unwrap();
    let placeholder = find_master_list(&connection, MISSING_PROGRAM).unwrap();

    let counts = CentralDataService
        .export_counts(&ctx, &[all_master_lists()])
        .unwrap();
    assert_eq!(
        counts[0].count,
        RecordCount {
            matching: 1,
            total: 1
        }
    );

    // By name, then by id.
    let path = write_file(
        dir.path(),
        master_list_sheet(vec![
            master_list_row(["", "", MISSING_PROGRAM, "", "TRUE", "", ""]),
            master_list_row([MISSING_PROGRAM, "", "", "", "TRUE", "", ""]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let protected =
        "missing_program is protected, as the server needs it, so import can't change it";
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("name"), protected), (3, Some("id"), protected)]
    );
    assert_eq!(
        find_master_list(&connection, MISSING_PROGRAM),
        Some(placeholder)
    );
}

/// The name sheet's columns a test uses; the rest are left out, so they keep their saved values.
const NAME_HEADERS: [&str; 15] = [
    "id",
    "code",
    "type",
    "name",
    "is_customer",
    "is_supplier",
    "supplying_store_code",
    "supplying_store_id",
    "phone",
    "is_manufacturer",
    "is_donor",
    "on_hold",
    "custom_data",
    "currency_code",
    "delete",
];

fn name_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![sheet_data("name", &NAME_HEADERS, rows)]).unwrap()
}

/// A row of `NAME_HEADERS` with the given cells; the others are blank.
fn name_row(cells: &[(&str, &str)]) -> Vec<Value> {
    NAME_HEADERS
        .iter()
        .map(
            |header| match cells.iter().find(|(column, _)| column == header) {
                Some((_, cell)) if !cell.is_empty() => Value::Text(cell.to_string()),
                _ => Value::Empty,
            },
        )
        .collect()
}

/// The flags a new name needs, after `cells`.
fn new_name_row(cells: &[(&'static str, &'static str)]) -> Vec<Value> {
    let flags = [
        ("is_customer", "TRUE"),
        ("is_supplier", "FALSE"),
        ("is_manufacturer", "FALSE"),
        ("is_donor", "FALSE"),
        ("on_hold", "FALSE"),
    ];
    name_row(&[cells, &flags].concat())
}

/// The clinic's saved values, so a row keeps them.
const CLINIC_CELLS: [(&str, &str); 6] = [
    ("code", "CL1"),
    ("type", "FACILITY"),
    ("supplying_store_code", "MS"),
    ("phone", "007"),
    ("custom_data", r#"{"beds":4}"#),
    ("currency_code", "NZD"),
];

fn datetime(year: i32, month: u32, day: u32) -> Option<chrono::NaiveDateTime> {
    NaiveDate::from_ymd_opt(year, month, day)
        .unwrap()
        .and_hms_opt(9, 30, 0)
}

fn central_clinic() -> NameRow {
    NameRow {
        id: "clinic".to_string(),
        code: "CL1".to_string(),
        name: "Central clinic".to_string(),
        r#type: NameRowType::Facility,
        is_customer: true,
        supplying_store_id: Some("store_main".to_string()),
        phone: Some(" 007 ".to_string()),
        comment: Some("Open weekdays".to_string()),
        margin: Some(12.5),
        currency_id: Some("nzd".to_string()),
        custom_data_string: Some(r#"{"beds":4}"#.to_string()),
        created_datetime: datetime(2024, 3, 1),
        ..Default::default()
    }
}

fn closed_clinic() -> NameRow {
    NameRow {
        id: "closed".to_string(),
        code: "CL2".to_string(),
        name: "Closed clinic".to_string(),
        r#type: NameRowType::Facility,
        // Sync can save a supplying store that hasn't arrived yet.
        supplying_store_id: Some("not_synced_yet".to_string()),
        deleted_datetime: datetime(2025, 1, 1),
        ..Default::default()
    }
}

fn patient() -> NameRow {
    NameRow {
        id: "patient".to_string(),
        code: "P001".to_string(),
        name: "Moreau, Anna".to_string(),
        r#type: NameRowType::Patient,
        first_name: Some("Anna".to_string()),
        last_name: Some("Moreau".to_string()),
        ..Default::default()
    }
}

fn find_name(connection: &StorageConnection, id: &str) -> Option<NameRow> {
    NameRowRepository::new(connection)
        .find_one_by_id(id)
        .unwrap()
}

fn names_containing(contains: Option<&str>) -> ExportTable {
    ExportTable {
        table: CentralDataTable::Name,
        filter: ExportFilter {
            contains: contains.map(str::to_string),
            ..Default::default()
        },
    }
}

/// Main store, coded MS, whose name is MAIN; the NZD currency; the clinic, which Main store
/// supplies; a deleted clinic; a patient; and the system name `invad`.
async fn name_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (_, connection, connection_manager, _) = setup_all(name, MockDataInserts::none()).await;
    let names = NameRowRepository::new(&connection);
    names
        .upsert_one(&NameRow {
            id: "main_store_name".to_string(),
            code: "MAIN".to_string(),
            name: "Main store".to_string(),
            r#type: NameRowType::Store,
            is_supplier: true,
            ..Default::default()
        })
        .unwrap();
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "store_main".to_string(),
            name_id: "main_store_name".to_string(),
            code: "MS".to_string(),
            ..Default::default()
        })
        .unwrap();
    CurrencyRowRepository::new(&connection)
        .upsert_one(&CurrencyRow {
            id: "nzd".to_string(),
            code: "NZD".to_string(),
            rate: 1.0,
            is_home_currency: true,
            date_updated: None,
            is_active: true,
        })
        .unwrap();
    for name in [
        central_clinic(),
        closed_clinic(),
        patient(),
        NameRow {
            id: "invad".to_string(),
            code: "invad".to_string(),
            name: "Inventory adjustments".to_string(),
            r#type: NameRowType::Invad,
            ..Default::default()
        },
    ] {
        names.upsert_one(&name).unwrap();
    }
    (
        connection,
        ServiceProvider::new(connection_manager),
        TempDir::new().unwrap(),
    )
}

// covers: OMS-REG-CDIO-01.10, .11, .22, .65, .134

#[actix_rt::test]
async fn names_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) = name_setup("central_data_name_round_trip").await;
    let ctx = service_provider.basic_context().unwrap();
    let ids = ["main_store_name", "clinic", "closed", "patient", "invad"];
    let before = ids.map(|id| find_name(&connection, id));

    let bytes = CentralDataService
        .export(&ctx, &[names_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();

    assert_eq!(summary.errors, vec![]);
    // The deleted clinic too, exported with DELETE.
    assert_eq!(summary.tables[0].unchanged, 3);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(ids.map(|id| find_name(&connection, id)), before);
}

// covers: OMS-REG-CDIO-01.132, .134

#[actix_rt::test]
async fn a_name_export_writes_references_by_code_and_deleted_names_with_delete() {
    let (_, service_provider, dir) = name_setup("central_data_name_export_cells").await;
    let ctx = service_provider.basic_context().unwrap();
    let bytes = CentralDataService
        .export(&ctx, &[names_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let Ok(sheets) = sheet::read(&path, MAX_IMPORT_ROWS) else {
        panic!("the export reads back")
    };
    let sheet = &sheets[0];
    let cell = |row: usize, column: &str| {
        let position = sheet.headers.iter().position(|h| h == column).unwrap();
        sheet.rows[row].cells[position].clone()
    };

    // Sorted by code: CL1, CL2, MAIN. Neither the patient nor the system name.
    assert_eq!(sheet.rows.len(), 3);
    assert_eq!(cell(0, "supplying_store_code"), "MS");
    assert_eq!(cell(0, "currency_code"), "NZD");
    assert_eq!(cell(0, "type"), "FACILITY");
    assert_eq!(cell(0, "created_datetime"), "2024-03-01T09:30:00Z");
    assert_eq!(
        (
            cell(0, "delete").as_str(),
            cell(0, "deleted_datetime").as_str()
        ),
        ("", "")
    );
    assert_eq!(
        (
            cell(1, "delete").as_str(),
            cell(1, "deleted_datetime").as_str()
        ),
        ("DELETE", "2025-01-01T09:30:00Z")
    );
    // A store sync hasn't brought yet: its id, and no code.
    assert_eq!(
        (
            cell(1, "supplying_store_code").as_str(),
            cell(1, "supplying_store_id").as_str()
        ),
        ("", "not_synced_yet")
    );
    assert!(!sheet.headers.contains(&"date_of_birth".to_string()));
}

// covers: OMS-REG-CDIO-01.46, .47, .132

#[actix_rt::test]
async fn a_name_export_searches_code_and_name() {
    let (_, service_provider, _) = name_setup("central_data_name_filter").await;
    let ctx = service_provider.basic_context().unwrap();
    let matching = |contains: Option<&str>| {
        let count = CentralDataService
            .export_counts(&ctx, &[names_containing(contains)])
            .unwrap()[0]
            .count;
        // Main store, the clinic and the deleted clinic.
        assert_eq!(count.total, 3);
        count.matching
    };

    assert_eq!(matching(None), 3);
    assert_eq!(matching(Some(" clinic ")), 2);
    assert_eq!(matching(Some("cl1")), 1);
    assert_eq!(matching(Some("moreau")), 0);
    assert_eq!(matching(Some("invad")), 0);
}

// covers: OMS-REG-CDIO-01.12, .27, .37, .58, .130

#[actix_rt::test]
async fn name_rows_add_and_update_by_code_and_type() {
    let (connection, service_provider, dir) = name_setup("central_data_name_upsert").await;
    let ctx = service_provider.basic_context().unwrap();
    // The clinic's code as a store's adds a name, though the row has an id.
    let new_store = || {
        new_name_row(&[
            ("id", "clinic_store"),
            ("code", "CL1"),
            ("type", "store"),
            ("name", "Clinic store"),
            ("custom_data", r#"{"region":"North"}"#),
        ])
    };
    // Found by code and type; blank required cells keep their values, blank optional ones clear
    // them, and missing columns keep theirs.
    let edited = || name_row(&[("code", "CL1"), ("type", "FACILITY"), ("is_donor", "1")]);

    let path = write_file(
        dir.path(),
        name_sheet(vec![
            new_store(),
            edited(),
            name_row(&[
                ("code", "NEW"),
                ("type", "PATIENT"),
                ("is_customer", "TRUE"),
                ("is_supplier", "maybe"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                4,
                Some("type"),
                "\"PATIENT\" must be one of FACILITY, BUILD, INVAD, REPACK, STORE, OTHERS"
            ),
            (
                4,
                Some("is_supplier"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            ),
            (4, Some("name"), "name is required for a new name"),
            (
                4,
                Some("is_manufacturer"),
                "is_manufacturer is required for a new name"
            ),
            (4, Some("is_donor"), "is_donor is required for a new name"),
            (4, Some("on_hold"), "on_hold is required for a new name"),
        ]
    );
    assert_eq!(find_name(&connection, "clinic"), Some(central_clinic()));

    let path = write_file(dir.path(), name_sheet(vec![new_store(), edited()]));
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].updated),
        (1, 1)
    );
    assert_eq!(summary.changes[0].record, "Clinic store (CL1)");
    assert_eq!(
        summary.changes[1]
            .fields
            .iter()
            .map(|field| (field.column, field.from.as_str(), field.to.as_str()))
            .collect::<Vec<_>>(),
        [
            ("supplying_store_code", "MS", ""),
            ("supplying_store_id", "store_main", ""),
            ("phone", " 007 ", ""),
            ("is_donor", "FALSE", "TRUE"),
            ("custom_data", r#"{"beds":4}"#, ""),
            ("currency_code", "NZD", ""),
            ("currency_id", "nzd", ""),
        ]
    );
    // The comment and margin have no column, so they're kept.
    assert_eq!(
        find_name(&connection, "clinic"),
        Some(NameRow {
            supplying_store_id: None,
            phone: None,
            is_donor: true,
            custom_data_string: None,
            currency_id: None,
            ..central_clinic()
        })
    );
    let added = NameRowRepository::new(&connection)
        .find_by_trimmed_code("CL1")
        .unwrap()
        .into_iter()
        .find(|name| name.r#type == NameRowType::Store)
        .unwrap();
    assert!(added.created_datetime.is_some());
    assert_eq!(
        added,
        NameRow {
            id: "clinic_store".to_string(),
            code: "CL1".to_string(),
            name: "Clinic store".to_string(),
            r#type: NameRowType::Store,
            is_customer: true,
            custom_data_string: Some(r#"{"region":"North"}"#.to_string()),
            created_datetime: added.created_datetime,
            ..Default::default()
        }
    );
}

// covers: OMS-REG-CDIO-01.131

#[actix_rt::test]
async fn a_name_code_and_type_are_not_changed_or_taken_by_import() {
    let (connection, service_provider, dir) = name_setup("central_data_name_conflicts").await;
    let ctx = service_provider.basic_context().unwrap();
    // A live clinic took the deleted clinic's code.
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "reopened".to_string(),
            code: "CL2".to_string(),
            name: "Reopened clinic".to_string(),
            r#type: NameRowType::Facility,
            ..Default::default()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        name_sheet(vec![
            // The clinic's id with another type, then with another code.
            name_row(&[("id", "clinic"), ("code", "CL1"), ("type", "STORE")]),
            name_row(&[("id", "clinic"), ("code", "CL9"), ("type", "FACILITY")]),
            // A new id beside the clinic's code and type.
            new_name_row(&[
                ("id", "copy"),
                ("code", "CL1"),
                ("type", "FACILITY"),
                ("name", "Copy"),
            ]),
            // A store coded CL1, then the code with no type, which now finds two names.
            new_name_row(&[("code", "CL1"), ("type", "STORE"), ("name", "Clinic store")]),
            name_row(&[("code", "CL1"), ("phone", "123")]),
            // Restoring the deleted clinic with the clinic's code, then with its own, now taken.
            name_row(&[("id", "closed"), ("code", "CL1"), ("type", "FACILITY")]),
            name_row(&[("id", "closed"), ("code", "CL2"), ("type", "FACILITY")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("type"),
                "type and id conflict: Central clinic (CL1) has type FACILITY and id clinic, but this row has type STORE and id clinic"
            ),
            (
                3,
                Some("code"),
                "code and id conflict: Central clinic has code CL1 and id clinic, but this row has code CL9 and id clinic"
            ),
            (
                4,
                Some("code"),
                "code and id conflict: Central clinic has code CL1 and id clinic, but this row has code CL1 and id copy"
            ),
            (
                6,
                Some("code"),
                "ambiguous reference, please provide id instead"
            ),
            (
                7,
                Some("code"),
                "code and id conflict: Closed clinic has code CL2 and id closed, but this row has code CL1 and id closed"
            ),
            (
                8,
                Some("code"),
                "Name reopened already has code CL2 and type FACILITY"
            ),
        ]
    );
}

// covers: OMS-REG-CDIO-01.24, .133

#[actix_rt::test]
async fn name_references_are_found_by_code_or_id() {
    let (connection, service_provider, dir) = name_setup("central_data_name_references").await;
    let ctx = service_provider.basic_context().unwrap();
    let new = |cells: &[(&'static str, &'static str)]| {
        new_name_row(&[&[("type", "FACILITY"), ("name", "Clinic")][..], cells].concat())
    };

    let path = write_file(
        dir.path(),
        name_sheet(vec![
            new(&[("code", "A"), ("supplying_store_code", "NOPE")]),
            new(&[("code", "B"), ("supplying_store_id", "nope")]),
            new(&[
                ("code", "C"),
                ("supplying_store_code", "MS"),
                ("supplying_store_id", "other"),
            ]),
            new(&[("code", "D"), ("currency_code", "EUR")]),
            new(&[("code", "E"), ("custom_data", "{")]),
            new(&[("code", "invad")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            // Found after every sheet has run, as the store sheet may add them, but listed in
            // row order.
            (
                2,
                Some("supplying_store_code"),
                "supplying_store_code \"NOPE\" not found"
            ),
            // Row 3's id alone is saved as given, as sync saves it.
            (
                4,
                Some("supplying_store_id"),
                "supplying_store_id \"other\" not found"
            ),
            (5, Some("currency_code"), "currency_code \"EUR\" not found"),
            (6, Some("custom_data"), "custom_data must be JSON, or blank"),
            (
                7,
                Some("code"),
                "This code belongs to a system name, which the server needs"
            ),
        ]
    );

    let path = write_file(
        dir.path(),
        name_sheet(vec![
            new(&[
                ("code", "G"),
                ("supplying_store_code", "MS"),
                ("currency_code", "NZD"),
            ]),
            new(&[("code", "H"), ("supplying_store_id", "not_synced_yet")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let waiting = NameRowRepository::new(&connection)
        .find_by_trimmed_code("H")
        .unwrap()
        .remove(0);
    assert_eq!(
        waiting.supplying_store_id.as_deref(),
        Some("not_synced_yet")
    );
    let added = NameRowRepository::new(&connection)
        .find_by_trimmed_code("G")
        .unwrap()
        .remove(0);
    assert_eq!(
        (
            added.supplying_store_id.as_deref(),
            added.currency_id.as_deref()
        ),
        (Some("store_main"), Some("nzd"))
    );
}

// covers: OMS-REG-CDIO-01.25, .26, .55, .134, .135

#[actix_rt::test]
async fn a_deleted_name_is_kept_marked_deleted_and_a_later_row_restores_it() {
    let (connection, service_provider, dir) = name_setup("central_data_name_delete").await;
    let ctx = service_provider.basic_context().unwrap();
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "customer".to_string(),
            code: "CU1".to_string(),
            name: "Customer".to_string(),
            r#type: NameRowType::Facility,
            ..Default::default()
        })
        .unwrap();
    InvoiceRowRepository::new(&connection)
        .upsert_one(&InvoiceRow {
            id: "shipment".to_string(),
            name_id: "customer".to_string(),
            store_id: "store_main".to_string(),
            ..Default::default()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        name_sheet(vec![
            // A store's own name, a name an invoice uses, a typo, and a change beside DELETE.
            name_row(&[("code", "MAIN"), ("type", "STORE"), ("delete", "DELETE")]),
            name_row(&[("code", "CU1"), ("type", "FACILITY"), ("delete", "DELETE")]),
            name_row(&[("code", "CL1"), ("type", "FACILITY"), ("delete", "delete")]),
            name_row(&[
                ("code", "CL1"),
                ("type", "FACILITY"),
                ("phone", "123"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("delete"),
                "Main store (MAIN) is used by a store, as its name, so it can't be deleted"
            ),
            (
                3,
                Some("delete"),
                "Customer (CU1) is used by an invoice, so it can't be deleted"
            ),
            (
                4,
                Some("delete"),
                "\"delete\" is not valid. Type DELETE to delete this row, or leave it blank"
            ),
            (
                5,
                Some("delete"),
                "A row marked DELETE can't also change phone. Clear it or put back the saved value"
            ),
        ]
    );

    // As exported, then a row for a name that isn't there.
    let path = write_file(
        dir.path(),
        name_sheet(vec![
            name_row(&[CLINIC_CELLS.as_slice(), &[("delete", "DELETE")]].concat()),
            name_row(&[("code", "GONE"), ("type", "FACILITY"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].deleted, summary.tables[0].unchanged),
        (1, 1)
    );
    let deleted = find_name(&connection, "clinic").unwrap();
    assert!(deleted.deleted_datetime.is_some());

    // Deleting it again changes nothing; a row without DELETE restores it.
    let path = write_file(
        dir.path(),
        name_sheet(vec![name_row(
            &[CLINIC_CELLS.as_slice(), &[("delete", "DELETE")]].concat(),
        )]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.tables[0].unchanged, 1);
    let path = write_file(dir.path(), name_sheet(vec![name_row(&CLINIC_CELLS)]));
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.changes[0].change, Change::Restored);
    assert_eq!(
        summary.changes[0].fields,
        vec![FieldChange {
            column: "delete",
            from: "DELETE".to_string(),
            to: String::new(),
        }]
    );
    assert_eq!(find_name(&connection, "clinic"), Some(central_clinic()));
}

// covers: OMS-REG-CDIO-01.137

#[actix_rt::test]
async fn a_patient_is_not_imported_on_the_name_sheet() {
    let (connection, service_provider, dir) = name_setup("central_data_name_patient").await;
    let ctx = service_provider.basic_context().unwrap();

    // By id; by id and code; by code alone, which finds no name, so it adds one.
    let path = write_file(
        dir.path(),
        name_sheet(vec![
            name_row(&[("id", "patient"), ("phone", "123")]),
            name_row(&[("id", "patient"), ("code", "P001"), ("type", "OTHERS")]),
            new_name_row(&[("code", "P001"), ("type", "OTHERS"), ("name", "Other")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    let error = "Moreau, Anna (P001) is a patient. Patients aren't imported on the name sheet";
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("id"), error), (3, Some("id"), error)]
    );
    assert_eq!(summary.tables[0].inserted, 1);
    assert_eq!(find_name(&connection, "patient"), Some(patient()));
}

// covers: OMS-REG-CDIO-01.136

#[actix_rt::test]
async fn a_system_name_is_not_exported_or_imported() {
    let (connection, service_provider, dir) = name_setup("central_data_name_system").await;
    let invad = find_name(&connection, "invad");
    let ctx = service_provider.basic_context().unwrap();
    // The server finds a system name by its exact code, so one with spaces around it is an
    // ordinary name, exported like any other.
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "repack".to_string(),
            code: " repack ".to_string(),
            name: "Repacks".to_string(),
            r#type: NameRowType::Repack,
            ..Default::default()
        })
        .unwrap();
    let counts = CentralDataService
        .export_counts(&ctx, &[names_containing(None)])
        .unwrap();
    assert_eq!(counts[0].count.total, 4);

    // By code and type, then by id.
    let path = write_file(
        dir.path(),
        name_sheet(vec![
            name_row(&[("code", "invad"), ("type", "INVAD"), ("phone", "1")]),
            name_row(&[("id", "invad"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let protected =
        "Inventory adjustments is a system name, as the server needs it, so import can't change it";
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("code"), protected), (3, Some("id"), protected)]
    );
    assert_eq!(find_name(&connection, "invad"), invad);
}

const STORE_HEADERS: [&str; 8] = [
    "id",
    "code",
    "site_id",
    "store_mode",
    "is_disabled",
    "name_code",
    "name_type",
    "name_id",
];

fn store_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![sheet_data("store", &STORE_HEADERS, rows)]).unwrap()
}

/// A row of `STORE_HEADERS` with the given cells; the others are blank.
fn store_row(cells: &[(&str, &str)]) -> Vec<Value> {
    STORE_HEADERS
        .iter()
        .map(
            |header| match cells.iter().find(|(column, _)| column == header) {
                Some((_, cell)) if !cell.is_empty() => Value::Text(cell.to_string()),
                _ => Value::Empty,
            },
        )
        .collect()
}

/// On site 1, after `cells`, unless they say otherwise.
fn new_store_row(cells: &[(&'static str, &'static str)]) -> Vec<Value> {
    let defaults = [
        ("site_id", "1"),
        ("store_mode", "STORE"),
        ("is_disabled", "FALSE"),
    ];
    let defaults: Vec<_> = defaults
        .into_iter()
        .filter(|(column, _)| !cells.iter().any(|(given, _)| given == column))
        .collect();
    store_row(&[cells, &defaults].concat())
}

fn find_store(connection: &StorageConnection, id: &str) -> Option<StoreRow> {
    StoreRowRepository::new(connection)
        .find_one_by_id(id)
        .unwrap()
}

fn store_by_code(connection: &StorageConnection, code: &str) -> StoreRow {
    StoreRowRepository::new(connection)
        .find_by_trimmed_code(code)
        .unwrap()
        .remove(0)
}

fn stores_containing(contains: Option<&str>, is_active: Option<bool>) -> ExportTable {
    ExportTable {
        table: CentralDataTable::Store,
        filter: ExportFilter {
            contains: contains.map(str::to_string),
            is_active,
        },
    }
}

/// `name_setup`, with site 1, a store-type name WARD without a store, and a logo on Main store,
/// which is on site 0, a site the server doesn't have.
async fn store_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (connection, service_provider, dir) = name_setup(name).await;
    SiteRowRepository::new(&connection)
        .upsert(&SiteRow {
            id: 1,
            code: "S1".to_string(),
            name: "Site 1".to_string(),
            ..Default::default()
        })
        .unwrap();
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "ward_name".to_string(),
            code: "WARD".to_string(),
            name: "Ward".to_string(),
            r#type: NameRowType::Store,
            ..Default::default()
        })
        .unwrap();
    StoreRowRepository::new(&connection)
        .update_logo("store_main", Some("aGVsbG8="))
        .unwrap();
    (connection, service_provider, dir)
}

// covers: OMS-REG-CDIO-01.10, .11, .22, .65, .142

#[actix_rt::test]
async fn stores_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) = store_setup("central_data_store_round_trip").await;
    let ctx = service_provider.basic_context().unwrap();
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            created_date: NaiveDate::from_ymd_opt(2024, 3, 1),
            store_mode: StoreMode::Dispensary,
            is_disabled: true,
            ..find_store(&connection, "store_main").unwrap()
        })
        .unwrap();
    let before = find_store(&connection, "store_main");

    let bytes = CentralDataService
        .export(&ctx, &[stores_containing(None, None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let Ok(sheets) = sheet::read(&path, MAX_IMPORT_ROWS) else {
        panic!("the export reads back")
    };
    let sheet = &sheets[0];
    let cell = |column: &str| {
        let position = sheet.headers.iter().position(|h| h == column).unwrap();
        sheet.rows[0].cells[position].clone()
    };
    assert_eq!(
        [
            "site_id",
            "store_mode",
            "is_disabled",
            "name_code",
            "name_type",
            "name_id",
            "created_date",
            "name_name"
        ]
        .map(cell),
        [
            "0",
            "DISPENSARY",
            "true",
            "MAIN",
            "STORE",
            "main_store_name",
            "2024-03-01",
            "Main store"
        ]
    );
    assert!(!sheet.headers.contains(&"logo".to_string()));

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 1);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(find_store(&connection, "store_main"), before);
}

// covers: OMS-REG-CDIO-01.46, .142

#[actix_rt::test]
async fn a_store_export_searches_name_and_code_and_filters_by_status() {
    let (connection, service_provider, _) = store_setup("central_data_store_filter").await;
    let ctx = service_provider.basic_context().unwrap();
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "ward".to_string(),
            code: "W1".to_string(),
            name_id: "ward_name".to_string(),
            is_disabled: true,
            ..Default::default()
        })
        .unwrap();
    let count = |contains: Option<&str>, is_active: Option<bool>| {
        CentralDataService
            .export_counts(&ctx, &[stores_containing(contains, is_active)])
            .unwrap()[0]
            .count
    };

    assert_eq!(
        count(None, None),
        RecordCount {
            matching: 2,
            total: 2
        }
    );
    assert_eq!(count(Some(" main "), None).matching, 1);
    assert_eq!(count(Some("w1"), None).matching, 1);
    assert_eq!(count(None, Some(true)).matching, 1);
    assert_eq!(count(Some("ward"), Some(true)).matching, 0);
}

// covers: OMS-REG-CDIO-01.12, .37, .138, .141, .142, .211

#[actix_rt::test]
async fn store_rows_add_and_update_by_code() {
    let (connection, service_provider, dir) = store_setup("central_data_store_upsert").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        store_sheet(vec![
            new_store_row(&[
                ("code", "W1"),
                ("name_code", "WARD"),
                ("name_type", "STORE"),
            ]),
            // No id: found by code. Blank cells keep the saved values.
            store_row(&[("code", "MS"), ("store_mode", "dispensary")]),
            store_row(&[("code", "NEW")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (4, Some("site_id"), "site_id is required for a new store"),
            (
                4,
                Some("store_mode"),
                "store_mode is required for a new store and must be one of STORE, DISPENSARY"
            ),
            (
                4,
                Some("is_disabled"),
                "is_disabled is required for a new store"
            ),
            (
                4,
                Some("name_code"),
                "name_code is required for a new store"
            ),
        ]
    );

    let path = write_file(
        dir.path(),
        store_sheet(vec![
            new_store_row(&[
                ("code", "W1"),
                ("name_code", "WARD"),
                ("name_type", "STORE"),
            ]),
            store_row(&[("code", "MS"), ("store_mode", "dispensary")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].updated),
        (1, 1)
    );
    assert_eq!(summary.changes[0].record, "Ward (W1)");
    assert_eq!(
        summary.changes[1].fields,
        vec![FieldChange {
            column: "store_mode",
            from: "STORE".to_string(),
            to: "DISPENSARY".to_string(),
        }]
    );
    let ward = store_by_code(&connection, "W1");
    assert_eq!(
        (ward.name_id.as_str(), ward.site_id, ward.created_date),
        ("ward_name", 1, Some(today()))
    );
    // It sees its own name, as the store made at setup does.
    let own_name: Vec<_> = NameStoreJoinRepository::new(&connection)
        .query_by_filter(NameStoreJoinFilter {
            store_id: Some(EqualFilter::equal_to(ward.id.clone())),
            ..Default::default()
        })
        .unwrap()
        .into_iter()
        .map(|join| (join.name_store_join.name_id, join.name_store_join.visible))
        .collect();
    assert_eq!(own_name, [("ward_name".to_string(), true)]);
    let main = find_store(&connection, "store_main").unwrap();
    assert_eq!(main.store_mode, StoreMode::Dispensary);
    // No column: the logo is left as it is.
    assert_eq!(
        StoreRowRepository::new(&connection)
            .find_logo_by_id("store_main")
            .unwrap()
            .unwrap()
            .logo
            .as_deref(),
        Some("aGVsbG8=")
    );

    // Disabling is a delete, enabling an update.
    let path = write_file(
        dir.path(),
        store_sheet(vec![
            store_row(&[("code", "W1"), ("is_disabled", "TRUE")]),
            store_row(&[("code", "MS"), ("is_disabled", "FALSE")]),
        ]),
    );
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            is_disabled: true,
            ..main
        })
        .unwrap();
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        summary
            .changes
            .iter()
            .map(|change| change.change)
            .collect::<Vec<_>>(),
        [Change::Deleted, Change::Updated]
    );
    assert!(store_by_code(&connection, "W1").is_disabled);
}

// covers: OMS-REG-CDIO-01.24, .139

#[actix_rt::test]
async fn a_store_finds_a_store_name_by_code_or_by_id() {
    let (connection, service_provider, dir) = store_setup("central_data_store_name").await;
    let ctx = service_provider.basic_context().unwrap();
    let names = NameRowRepository::new(&connection);
    // WARD is a facility's code too, but a blank type looks among store names.
    names
        .upsert_one(&NameRow {
            id: "ward_facility".to_string(),
            code: "WARD".to_string(),
            name: "Ward clinic".to_string(),
            r#type: NameRowType::Facility,
            ..Default::default()
        })
        .unwrap();
    names
        .upsert_one(&NameRow {
            id: "old_store_name".to_string(),
            code: "OLD".to_string(),
            name: "Old store".to_string(),
            r#type: NameRowType::Store,
            deleted_datetime: datetime(2025, 1, 1),
            ..Default::default()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        store_sheet(vec![
            new_store_row(&[("code", "A"), ("name_code", "NOPE"), ("name_type", "STORE")]),
            new_store_row(&[("code", "B"), ("name_id", "clinic")]),
            new_store_row(&[
                ("code", "C"),
                ("name_code", "CL1"),
                ("name_type", "FACILITY"),
            ]),
            new_store_row(&[("code", "D"), ("name_code", "OLD")]),
            new_store_row(&[("code", "E"), ("name_code", "MAIN"), ("name_type", "STORE")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("name_code"), "name_code \"NOPE\" not found"),
            (
                3,
                Some("name_id"),
                "Central clinic (CL1) is of type FACILITY. A store's name must be of type STORE"
            ),
            (
                4,
                Some("name_code"),
                "Central clinic (CL1) is of type FACILITY. A store's name must be of type STORE"
            ),
            (
                5,
                Some("name_code"),
                "Old store (OLD) is deleted, so a store can't have it"
            ),
            (
                6,
                Some("name_code"),
                "Main store (MAIN) is already store MS's name. A name can be only one store's"
            ),
        ]
    );

    let path = write_file(
        dir.path(),
        store_sheet(vec![
            new_store_row(&[("code", "F"), ("name_code", "WARD")]),
            new_store_row(&[("code", "G"), ("name_id", "main_store_name")]),
        ]),
    );
    // Main store gives up its name to G.
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            name_id: "ward_facility".to_string(),
            ..find_store(&connection, "store_main").unwrap()
        })
        .unwrap();
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(store_by_code(&connection, "F").name_id, "ward_name");
    assert_eq!(store_by_code(&connection, "G").name_id, "main_store_name");

    // A saved store whose name isn't a store name, as Main store's now is, keeps it and stays
    // editable, and an unedited export of it imports unchanged.
    let bytes = CentralDataService
        .export(&ctx, &[stores_containing(Some("MS"), None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 1);
    let path = write_file(
        dir.path(),
        store_sheet(vec![store_row(&[
            ("code", "MS"),
            ("store_mode", "DISPENSARY"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let main = find_store(&connection, "store_main").unwrap();
    assert_eq!(
        (main.name_id.as_str(), main.store_mode),
        ("ward_facility", StoreMode::Dispensary)
    );
}

// covers: OMS-REG-CDIO-01.139

#[actix_rt::test]
async fn a_store_cannot_have_a_patient_or_a_system_name() {
    let (connection, service_provider, dir) = store_setup("central_data_store_patient_name").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        store_sheet(vec![
            new_store_row(&[("code", "A"), ("name_id", "patient")]),
            new_store_row(&[("code", "B"), ("name_id", "invad")]),
            new_store_row(&[
                ("code", "C"),
                ("name_code", "invad"),
                ("name_type", "INVAD"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("name_id"),
                "Moreau, Anna (P001) is of type PATIENT. A store's name must be of type STORE"
            ),
            (
                3,
                Some("name_id"),
                "Inventory adjustments (invad) is of type INVAD. A store's name must be of type STORE"
            ),
            (
                4,
                Some("name_code"),
                "Inventory adjustments (invad) is of type INVAD. A store's name must be of type STORE"
            ),
        ]
    );
    assert!(
        StoreRowRepository::new(&connection)
            .find_by_trimmed_code("A")
            .unwrap()
            .is_empty()
    );
}

// covers: OMS-REG-CDIO-01.139

#[actix_rt::test]
async fn a_store_whose_name_is_a_patient_imports_unchanged() {
    let (connection, service_provider, dir) =
        store_setup("central_data_store_patient_round_trip").await;
    let ctx = service_provider.basic_context().unwrap();
    // As old data can have it; import can't give a store such a name.
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            name_id: "patient".to_string(),
            ..find_store(&connection, "store_main").unwrap()
        })
        .unwrap();
    let before = find_store(&connection, "store_main");

    let bytes = CentralDataService
        .export(&ctx, &[stores_containing(Some("MS"), None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 1);
    assert_eq!(find_store(&connection, "store_main"), before);
}

// covers: OMS-REG-CDIO-01.23, .39, .140

#[actix_rt::test]
async fn a_store_code_is_not_taken_and_its_site_must_be_on_the_server() {
    let (connection, service_provider, dir) = store_setup("central_data_store_code_site").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        store_sheet(vec![
            new_store_row(&[("id", "new"), ("code", "MS"), ("name_code", "WARD")]),
            new_store_row(&[("code", "W1"), ("name_code", "WARD"), ("site_id", "99")]),
            store_row(&[("code", "MS"), ("site_id", "99")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("code"),
                "code and id conflict: MS has code MS and id store_main, but this row has code MS and id new"
            ),
            (3, Some("site_id"), "Site 99 isn't on this server"),
            (4, Some("site_id"), "Site 99 isn't on this server"),
        ]
    );

    // Main store is on site 0, which the server doesn't have, and stays editable.
    let path = write_file(
        dir.path(),
        store_sheet(vec![store_row(&[
            ("code", "MS"),
            ("site_id", "0"),
            ("store_mode", "DISPENSARY"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        find_store(&connection, "store_main").unwrap().store_mode,
        StoreMode::Dispensary
    );
}

// covers: OMS-REG-CDIO-01.133, .143

#[actix_rt::test]
async fn a_name_finds_a_supplying_store_the_store_sheet_adds() {
    let (connection, service_provider, dir) = store_setup("central_data_name_later_store").await;
    let ctx = service_provider.basic_context().unwrap();
    let file = |names: Vec<Vec<Value>>, stores: Vec<Vec<Value>>| {
        sheet::write(vec![
            sheet_data("name", &NAME_HEADERS, names),
            sheet_data("store", &STORE_HEADERS, stores),
        ])
        .unwrap()
    };
    // The clinic's saved values, but supplied by the store the file adds.
    let clinic = name_row(&[
        ("code", "CL1"),
        ("type", "FACILITY"),
        ("supplying_store_code", "NEW"),
        ("phone", "007"),
        ("custom_data", r#"{"beds":4}"#),
        ("currency_code", "NZD"),
    ]);
    let new_store = new_store_row(&[("id", "new_store"), ("code", "NEW"), ("name_code", "WARD")]);
    let path = write_file(
        dir.path(),
        file(
            vec![
                clinic,
                new_name_row(&[
                    ("code", "CL9"),
                    ("type", "FACILITY"),
                    ("name", "New clinic"),
                    ("supplying_store_id", "new_store"),
                ]),
            ],
            vec![new_store],
        ),
    );

    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        summary.changes[0],
        RowChange {
            sheet: "name".to_string(),
            row: 2,
            record: "Central clinic (CL1)".to_string(),
            change: Change::Updated,
            fields: vec![FieldChange {
                column: "supplying_store_code",
                from: "MS".to_string(),
                to: "NEW".to_string(),
            }],
        }
    );
    // A preview writes nothing.
    assert_eq!(
        find_name(&connection, "clinic")
            .unwrap()
            .supplying_store_id
            .as_deref(),
        Some("store_main")
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let supplier = |code: &str| {
        NameRowRepository::new(&connection)
            .find_by_trimmed_code(code)
            .unwrap()
            .remove(0)
            .supplying_store_id
    };
    assert_eq!(supplier("CL1").as_deref(), Some("new_store"));
    assert_eq!(supplier("CL9").as_deref(), Some("new_store"));

    // Neither saved nor in the file; a DELETE row's must be saved, though the file adds it.
    let path = write_file(
        dir.path(),
        file(
            vec![
                new_name_row(&[
                    ("code", "CL8"),
                    ("type", "FACILITY"),
                    ("name", "Gone clinic"),
                    ("supplying_store_code", "GONE"),
                ]),
                name_row(&[
                    ("code", "CL9"),
                    ("type", "FACILITY"),
                    ("supplying_store_code", "NEW2"),
                    ("delete", "DELETE"),
                ]),
                // With a store sheet, an id alone is checked too.
                new_name_row(&[
                    ("code", "CL6"),
                    ("type", "FACILITY"),
                    ("name", "Waiting clinic"),
                    ("supplying_store_id", "not_synced_yet"),
                ]),
            ],
            vec![new_store_row(&[("code", "NEW2"), ("name_code", "MAIN")])],
        ),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    let not_found: Vec<_> = row_errors(&summary)
        .into_iter()
        .filter(|(_, _, message)| message.ends_with("not found"))
        .collect();
    assert_eq!(
        not_found,
        vec![
            (
                2,
                Some("supplying_store_code"),
                "supplying_store_code \"GONE\" not found"
            ),
            (
                3,
                Some("supplying_store_code"),
                "supplying_store_code \"NEW2\" not found"
            ),
            (
                4,
                Some("supplying_store_id"),
                "supplying_store_id \"not_synced_yet\" not found"
            ),
        ]
    );
    // Counted against the name sheet, though found after the store sheet ran.
    assert_eq!(summary.tables[0].table, CentralDataTable::Name);
    assert_eq!(summary.tables[0].error_count, 4);
    // A row with errors writes nothing, so CL8 isn't counted or listed as added.
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].deleted),
        (0, 0)
    );
    assert!(summary.changes.iter().all(|change| change.sheet != "name"));
}

// covers: OMS-REG-CDIO-01.143

#[actix_rt::test]
async fn without_a_store_sheet_a_missing_supplying_store_is_saved_by_its_id() {
    let (_, service_provider, dir) = store_setup("central_data_name_no_store_sheet").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        name_sheet(vec![
            new_name_row(&[
                ("code", "CL8"),
                ("type", "FACILITY"),
                ("name", "Gone clinic"),
                ("supplying_store_code", "GONE"),
            ]),
            new_name_row(&[("code", "CL7"), ("type", "FACILITY"), ("name", "Clinic")]),
            // A store the code and id don't find is saved by its id, as sync saves it.
            new_name_row(&[
                ("code", "CL6"),
                ("type", "FACILITY"),
                ("name", "Waiting clinic"),
                ("supplying_store_code", "LATER"),
                ("supplying_store_id", "later_store"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    // A code alone has no id to save.
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("supplying_store_code"),
            "supplying_store_code \"GONE\" not found"
        )]
    );
    assert_eq!(summary.tables[0].inserted, 2);
    assert_eq!(
        summary
            .changes
            .iter()
            .map(|change| change.row)
            .collect::<Vec<_>>(),
        [3, 4]
    );
}

// covers: OMS-REG-CDIO-01.15, .143

#[actix_rt::test]
async fn an_error_found_after_the_store_sheet_is_listed_in_row_order_past_the_cap() {
    let (_, service_provider, dir) = store_setup("central_data_later_error_listed").await;
    let ctx = service_provider.basic_context().unwrap();
    // Row 2's store is looked for after the store sheet; rows 3 on each have an error at once.
    let mut names = vec![new_name_row(&[
        ("code", "CL8"),
        ("type", "FACILITY"),
        ("name", "Gone clinic"),
        ("supplying_store_code", "GONE"),
    ])];
    for i in 0..MAX_ROWS_LISTED + 20 {
        let mut row = new_name_row(&[("type", "FACILITY"), ("name", "Clinic")]);
        row[1] = Value::Text(format!("C{i}"));
        row[4] = Value::Text("maybe".to_string());
        names.push(row);
    }
    let bytes = sheet::write(vec![
        sheet_data("name", &NAME_HEADERS, names),
        sheet_data(
            "store",
            &STORE_HEADERS,
            vec![new_store_row(&[("code", "W1"), ("name_code", "WARD")])],
        ),
    ])
    .unwrap();
    let path = write_file(dir.path(), bytes);

    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(summary.error_count as usize, MAX_ROWS_LISTED + 21);
    assert_eq!(summary.errors.len(), MAX_ROWS_LISTED);
    assert_eq!(
        (summary.errors[0].row, summary.errors[0].column.as_deref()),
        (Some(2), Some("supplying_store_code"))
    );
}

// covers: OMS-REG-CDIO-01.144

#[actix_rt::test]
async fn a_store_on_the_servers_own_site_can_be_moved_and_disabled() {
    let (connection, service_provider, dir) = store_setup("central_data_store_own_site").await;
    let ctx = service_provider.basic_context().unwrap();
    // This server is site 2, with its own store.
    SiteRowRepository::new(&connection)
        .upsert(&SiteRow {
            id: 2,
            code: "S2".to_string(),
            name: "Central".to_string(),
            ..Default::default()
        })
        .unwrap();
    KeyValueStoreRepository::new(&connection)
        .set_i32(KeyType::SettingsSyncSiteId, Some(2))
        .unwrap();
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "central".to_string(),
            code: "CENTRAL".to_string(),
            site_id: 2,
            name_id: "ward_name".to_string(),
            ..Default::default()
        })
        .unwrap();

    // As sync and the Sites screen allow, though its users can no longer log in here.
    let path = write_file(
        dir.path(),
        store_sheet(vec![store_row(&[
            ("code", "CENTRAL"),
            ("site_id", "1"),
            ("is_disabled", "TRUE"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.changes[0].change, Change::Deleted);
    let central = find_store(&connection, "central").unwrap();
    assert_eq!((central.site_id, central.is_disabled), (1, true));
}

const JOIN_HEADERS: [&str; 9] = [
    "id",
    "store_code",
    "store_id",
    "name_code",
    "name_type",
    "name_id",
    "name_is_customer",
    "name_is_supplier",
    "delete",
];

fn join_sheet_data(rows: Vec<Vec<Value>>) -> SheetData {
    sheet_data("name_store_join", &JOIN_HEADERS, rows)
}

fn join_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![join_sheet_data(rows)]).unwrap()
}

/// A row of `JOIN_HEADERS` with the given cells; the others are blank.
fn join_row(cells: &[(&str, &str)]) -> Vec<Value> {
    JOIN_HEADERS
        .iter()
        .map(
            |header| match cells.iter().find(|(column, _)| column == header) {
                Some((_, cell)) if !cell.is_empty() => Value::Text(cell.to_string()),
                _ => Value::Empty,
            },
        )
        .collect()
}

fn add_join(connection: &StorageConnection, id: &str, store_id: &str, name_id: &str) {
    NameStoreJoinRepository::new(connection)
        .upsert_one(&NameStoreJoinRow {
            id: id.to_string(),
            store_id: store_id.to_string(),
            name_id: name_id.to_string(),
            name_is_customer: true,
            name_is_supplier: false,
            visible: true,
        })
        .unwrap();
}

/// Each of the store's joins, as (id, name id, customer, supplier), in id order.
fn joins_of(connection: &StorageConnection, store_id: &str) -> Vec<(String, String, bool, bool)> {
    let mut joins: Vec<_> = NameStoreJoinRepository::new(connection)
        .query_by_filter(NameStoreJoinFilter {
            store_id: Some(EqualFilter::equal_to(store_id.to_string())),
            ..Default::default()
        })
        .unwrap()
        .into_iter()
        .map(|join| {
            let join = join.name_store_join;
            (
                join.id,
                join.name_id,
                join.name_is_customer,
                join.name_is_supplier,
            )
        })
        .collect();
    joins.sort();
    joins
}

fn joins_containing(contains: Option<&str>) -> ExportTable {
    ExportTable {
        table: CentralDataTable::NameStoreJoin,
        filter: ExportFilter {
            contains: contains.map(str::to_string),
            ..Default::default()
        },
    }
}

/// `store_setup`, with Main store seeing its own name, the clinic, the deleted clinic, the patient
/// and the system name `invad`.
async fn join_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (connection, service_provider, dir) = store_setup(name).await;
    for (id, name_id) in [
        ("join_own", "main_store_name"),
        ("join_clinic", "clinic"),
        ("join_closed", "closed"),
        ("join_patient", "patient"),
        ("join_invad", "invad"),
    ] {
        add_join(&connection, id, "store_main", name_id);
    }
    (connection, service_provider, dir)
}

// covers: OMS-REG-CDIO-01.10, .11, .145

#[actix_rt::test]
async fn name_store_joins_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) = join_setup("central_data_join_round_trip").await;
    let ctx = service_provider.basic_context().unwrap();
    let before = joins_of(&connection, "store_main");

    let bytes = CentralDataService
        .export(&ctx, &[joins_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let Ok(sheets) = sheet::read(&path, MAX_IMPORT_ROWS) else {
        panic!("the export reads back")
    };
    let sheet = &sheets[0];
    assert_eq!(
        sheet.headers,
        [JOIN_HEADERS.as_slice(), &["store_name", "name_name"]].concat()
    );
    // Neither the patient's join nor the system name's; the deleted name's is.
    let rows: Vec<&[String]> = sheet.rows.iter().map(|row| row.cells.as_slice()).collect();
    assert_eq!(
        rows,
        [
            [
                "join_clinic",
                "MS",
                "store_main",
                "CL1",
                "FACILITY",
                "clinic",
                "true",
                "false",
                "",
                "Main store",
                "Central clinic"
            ],
            [
                "join_closed",
                "MS",
                "store_main",
                "CL2",
                "FACILITY",
                "closed",
                "true",
                "false",
                "",
                "Main store",
                "Closed clinic"
            ],
            [
                "join_own",
                "MS",
                "store_main",
                "MAIN",
                "STORE",
                "main_store_name",
                "true",
                "false",
                "",
                "Main store",
                "Main store"
            ],
        ]
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 3);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(joins_of(&connection, "store_main"), before);
}

// covers: OMS-REG-CDIO-01.46, .145

#[actix_rt::test]
async fn a_name_store_join_export_searches_name_and_store_code() {
    let (connection, service_provider, _) = join_setup("central_data_join_filter").await;
    let ctx = service_provider.basic_context().unwrap();
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "ward".to_string(),
            code: "W1".to_string(),
            name_id: "ward_name".to_string(),
            ..Default::default()
        })
        .unwrap();
    add_join(&connection, "join_ward", "ward", "clinic");
    let count = |contains: Option<&str>| {
        CentralDataService
            .export_counts(&ctx, &[joins_containing(contains)])
            .unwrap()[0]
            .count
    };

    assert_eq!(
        count(None),
        RecordCount {
            matching: 4,
            total: 4
        }
    );
    assert_eq!(count(Some(" cl1 ")).matching, 2);
    assert_eq!(count(Some("w1")).matching, 1);
    assert_eq!(count(Some("ms")).matching, 3);
    // Not the name's name.
    assert_eq!(count(Some("clinic")).matching, 0);
}

// covers: OMS-REG-CDIO-01.12, .25, .26, .36, .55, .146, .147

#[actix_rt::test]
async fn name_store_join_rows_add_update_and_delete_by_store_and_name() {
    let (connection, service_provider, dir) = join_setup("central_data_join_upsert").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        join_sheet(vec![
            join_row(&[("store_code", "MS"), ("name_code", "WARD")]),
            join_row(&[("name_code", "WARD"), ("name_is_customer", "TRUE")]),
            join_row(&[
                ("store_code", "MS"),
                ("name_code", "CL1"),
                ("delete", "Delete"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("name_is_customer"),
                "name_is_customer is required for a new name in a store"
            ),
            (
                2,
                Some("name_is_supplier"),
                "name_is_supplier is required for a new name in a store"
            ),
            (
                3,
                Some("store_code"),
                "store_code is required for a new name in a store"
            ),
            (
                3,
                Some("name_is_supplier"),
                "name_is_supplier is required for a new name in a store"
            ),
            (
                4,
                Some("delete"),
                "\"Delete\" is not valid. Type DELETE to delete this row, or leave it blank"
            ),
        ]
    );

    let path = write_file(
        dir.path(),
        join_sheet(vec![
            // WARD is a store's name; a blank type looks among every type but patients.
            join_row(&[
                ("store_code", "MS"),
                ("name_code", "WARD"),
                ("name_is_customer", "FALSE"),
                ("name_is_supplier", "TRUE"),
            ]),
            // No id: found by its store and name. A blank cell keeps the saved value.
            join_row(&[
                ("store_code", "MS"),
                ("name_code", "CL1"),
                ("name_type", "facility"),
                ("name_is_supplier", "TRUE"),
            ]),
            join_row(&[
                ("id", "join_closed"),
                ("store_code", "MS"),
                ("name_code", "CL2"),
                ("name_is_customer", "TRUE"),
                ("delete", "DELETE"),
            ]),
            // Already gone: unchanged.
            join_row(&[("id", "gone"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        summary.tables,
        vec![TableChanges {
            table: CentralDataTable::NameStoreJoin,
            inserted: 1,
            updated: 1,
            deleted: 1,
            unchanged: 1,
            error_count: 0,
        }]
    );
    assert_eq!(
        summary
            .changes
            .iter()
            .map(|change| (change.record.as_str(), change.change))
            .collect::<Vec<_>>(),
        [
            ("Ward (WARD) in store MS", Change::Inserted),
            ("Central clinic (CL1) in store MS", Change::Updated),
            ("Closed clinic (CL2) in store MS", Change::Deleted),
        ]
    );
    assert_eq!(
        summary.changes[1].fields,
        vec![FieldChange {
            column: "name_is_supplier",
            from: "FALSE".to_string(),
            to: "TRUE".to_string(),
        }]
    );
    let joins = joins_of(&connection, "store_main");
    let mut names: Vec<_> = joins
        .iter()
        .map(|(_, name_id, customer, supplier)| (name_id.as_str(), *customer, *supplier))
        .collect();
    names.sort();
    assert_eq!(
        names,
        [
            ("clinic", true, true),
            ("invad", true, false),
            ("main_store_name", true, false),
            ("patient", true, false),
            ("ward_name", false, true),
        ]
    );

    // A DELETE row may keep the saved values, but not change them.
    let path = write_file(
        dir.path(),
        join_sheet(vec![join_row(&[
            ("store_code", "MS"),
            ("name_code", "CL1"),
            ("name_is_supplier", "FALSE"),
            ("delete", "DELETE"),
        ])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("delete"),
            "A row marked DELETE can't also change name_is_supplier. Clear it or put back the saved value"
        )]
    );
}

// covers: OMS-REG-CDIO-01.24, .148

#[actix_rt::test]
async fn a_name_store_join_finds_its_store_and_name_by_code_or_id() {
    let (connection, service_provider, dir) = join_setup("central_data_join_references").await;
    let ctx = service_provider.basic_context().unwrap();
    // CL1 is a store's code too, so a code with no type is ambiguous.
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "cl1_store".to_string(),
            code: "CL1".to_string(),
            name: "Clinic store".to_string(),
            r#type: NameRowType::Store,
            ..Default::default()
        })
        .unwrap();
    let new = |cells: &[(&'static str, &'static str)]| {
        join_row(
            &[
                cells,
                &[("name_is_customer", "TRUE"), ("name_is_supplier", "FALSE")],
            ]
            .concat(),
        )
    };

    let path = write_file(
        dir.path(),
        join_sheet(vec![
            new(&[("store_code", "NOPE"), ("name_code", "WARD")]),
            new(&[("store_code", "MS"), ("name_code", "CL1")]),
            new(&[("store_code", "MS"), ("name_id", "patient")]),
            new(&[("store_code", "MS"), ("name_id", "invad")]),
            // A code alone never finds a system name.
            new(&[("store_code", "MS"), ("name_code", "invad")]),
            new(&[
                ("store_code", "MS"),
                ("name_id", "cl1_store"),
                ("name_type", "FACILITY"),
            ]),
            new(&[
                ("store_id", "store_main"),
                ("name_code", "CL2"),
                ("name_type", "FACILITY"),
            ]),
            // The id settles the ambiguous code.
            new(&[
                ("store_id", "store_main"),
                ("name_code", "CL1"),
                ("name_id", "cl1_store"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("store_code"), "store_code \"NOPE\" not found"),
            (
                3,
                Some("name_code"),
                "ambiguous reference, please provide id instead"
            ),
            (
                4,
                Some("name_id"),
                "Moreau, Anna (P001) is a patient, so import doesn't change which stores see a patient"
            ),
            (
                5,
                Some("name_id"),
                "Inventory adjustments (invad) is a system name, as the server needs it, so import can't change which stores see it"
            ),
            (6, Some("name_code"), "name_code \"invad\" not found"),
            (
                7,
                Some("name_type"),
                "Clinic store (CL1) is of type STORE, not FACILITY"
            ),
        ]
    );
    // The deleted clinic's join is saved, so a new one is the service's check.
    NameStoreJoinRepository::new(&connection)
        .delete("join_closed")
        .unwrap();
    let path = write_file(
        dir.path(),
        join_sheet(vec![new(&[
            ("store_code", "MS"),
            ("name_code", "CL2"),
            ("name_type", "FACILITY"),
        ])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("name_code"),
            "Closed clinic (CL2) is deleted, so a store can't be given it"
        )]
    );
}

// covers: OMS-REG-CDIO-01.24, .39, .149

#[actix_rt::test]
async fn a_name_store_join_row_cannot_change_its_store_or_name() {
    let (connection, service_provider, dir) = join_setup("central_data_join_conflict").await;
    let ctx = service_provider.basic_context().unwrap();
    // Two joins for one store and name, as legacy data can have.
    add_join(&connection, "join_clinic_2", "store_main", "clinic");
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "store_ward".to_string(),
            code: "WD".to_string(),
            name_id: "clinic".to_string(),
            ..Default::default()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        join_sheet(vec![
            join_row(&[
                ("id", "join_own"),
                ("name_code", "WARD"),
                ("name_type", "STORE"),
            ]),
            join_row(&[
                ("id", "copied"),
                ("store_code", "MS"),
                ("name_code", "MAIN"),
                ("name_type", "STORE"),
            ]),
            join_row(&[("store_code", "MS"), ("name_code", "CL1")]),
            // The id settles it.
            join_row(&[
                ("id", "join_clinic_2"),
                ("store_code", "MS"),
                ("name_code", "CL1"),
                ("name_is_supplier", "TRUE"),
            ]),
            join_row(&[("id", "join_own"), ("store_code", "WD")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("name_code"),
                "name_code and id conflict: Main store (MAIN) in store MS has name_code MAIN and id join_own, but this row has name_code WARD and id join_own"
            ),
            (
                3,
                Some("id"),
                "id conflict: Main store (MAIN) in store MS has id join_own, but this row has id copied"
            ),
            (
                4,
                Some("id"),
                "ambiguous reference, please provide id instead"
            ),
            (
                6,
                Some("store_code"),
                "store_code and id conflict: Main store (MAIN) in store MS has store_code MS and id join_own, but this row has store_code WD and id join_own"
            ),
        ]
    );
    assert_eq!(summary.tables[0].updated, 1);
}

// covers: OMS-REG-CDIO-01.148

#[actix_rt::test]
async fn a_name_store_join_row_with_only_an_id_cannot_touch_a_patients_or_system_names_record() {
    let (connection, service_provider, dir) = join_setup("central_data_join_id_only_patient").await;
    let ctx = service_provider.basic_context().unwrap();
    let before = joins_of(&connection, "store_main");

    let path = write_file(
        dir.path(),
        join_sheet(vec![
            join_row(&[("id", "join_patient"), ("delete", "DELETE")]),
            join_row(&[("id", "join_invad"), ("delete", "DELETE")]),
            join_row(&[("id", "join_patient"), ("name_is_supplier", "TRUE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let patient =
        "Moreau, Anna (P001) is a patient, so import doesn't change which stores see a patient";
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("name_id"), patient),
            (
                3,
                Some("name_id"),
                "Inventory adjustments (invad) is a system name, as the server needs it, so import can't change which stores see it"
            ),
            (4, Some("name_id"), patient),
        ]
    );
    assert_eq!(joins_of(&connection, "store_main"), before);
}

// covers: OMS-REG-CDIO-01.150

#[actix_rt::test]
async fn a_name_store_join_finds_a_store_the_store_sheet_adds_and_a_missing_reference_stops_a_delete()
 {
    let (connection, service_provider, dir) = join_setup("central_data_join_later_store").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        sheet::write(vec![
            sheet_data(
                "store",
                &STORE_HEADERS,
                vec![new_store_row(&[
                    ("code", "W1"),
                    ("name_code", "WARD"),
                    ("name_type", "STORE"),
                ])],
            ),
            join_sheet_data(vec![join_row(&[
                ("store_code", "W1"),
                ("name_code", "CL1"),
                ("name_is_customer", "TRUE"),
                ("name_is_supplier", "FALSE"),
            ])]),
        ])
        .unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let ward = store_by_code(&connection, "W1");
    let mut names: Vec<_> = joins_of(&connection, &ward.id)
        .into_iter()
        .map(|(_, name_id, _, _)| name_id)
        .collect();
    names.sort();
    // With its own name, which a new store sees.
    assert_eq!(names, ["clinic", "ward_name"]);

    // A DELETE row whose store isn't found stops the whole import.
    let before = joins_of(&connection, "store_main");
    let path = write_file(
        dir.path(),
        join_sheet(vec![
            join_row(&[
                ("store_code", "MS"),
                ("name_code", "CL1"),
                ("delete", "DELETE"),
            ]),
            join_row(&[
                ("store_code", "NOPE"),
                ("name_code", "CL1"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(3, Some("store_code"), "store_code \"NOPE\" not found")]
    );
    assert_eq!(joins_of(&connection, "store_main"), before);
}

// covers: OMS-REG-CDIO-01.151

#[actix_rt::test]
async fn another_servers_join_for_a_new_stores_own_name_takes_the_place_of_the_one_it_got() {
    let (connection, service_provider, dir) = join_setup("central_data_join_own_name").await;
    let ctx = service_provider.basic_context().unwrap();

    // As exported from another server: the store and its own-name join keep that server's ids.
    let path = write_file(
        dir.path(),
        sheet::write(vec![
            sheet_data(
                "store",
                &STORE_HEADERS,
                vec![new_store_row(&[
                    ("id", "ward"),
                    ("code", "W1"),
                    ("name_code", "WARD"),
                    ("name_type", "STORE"),
                ])],
            ),
            join_sheet_data(vec![
                join_row(&[
                    ("id", "ward_own"),
                    ("store_code", "W1"),
                    ("name_code", "WARD"),
                    ("name_type", "STORE"),
                    ("name_is_customer", "FALSE"),
                    ("name_is_supplier", "TRUE"),
                ]),
                // A saved store's own-name join under another id is still a conflict.
                join_row(&[
                    ("id", "copied"),
                    ("store_code", "MS"),
                    ("name_code", "MAIN"),
                    ("name_type", "STORE"),
                ]),
            ]),
        ])
        .unwrap(),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            3,
            Some("id"),
            "id conflict: Main store (MAIN) in store MS has id join_own, but this row has id copied"
        )]
    );

    let path = write_file(
        dir.path(),
        sheet::write(vec![
            sheet_data(
                "store",
                &STORE_HEADERS,
                vec![new_store_row(&[
                    ("id", "ward"),
                    ("code", "W1"),
                    ("name_code", "WARD"),
                    ("name_type", "STORE"),
                ])],
            ),
            join_sheet_data(vec![join_row(&[
                ("id", "ward_own"),
                ("store_code", "W1"),
                ("name_code", "WARD"),
                ("name_type", "STORE"),
                ("name_is_customer", "FALSE"),
                ("name_is_supplier", "TRUE"),
            ])]),
        ])
        .unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        summary
            .changes
            .iter()
            .map(|change| (change.sheet.as_str(), change.change))
            .collect::<Vec<_>>(),
        [
            ("store", Change::Inserted),
            ("name_store_join", Change::Inserted)
        ]
    );
    assert_eq!(
        joins_of(&connection, "ward"),
        [("ward_own".to_string(), "ward_name".to_string(), false, true)]
    );

    // Imported again, it's unchanged.
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.changes, vec![]);
}

// User permissions

const PERMISSION_HEADERS: [&str; 9] = [
    "id",
    "username",
    "user_id",
    "store_code",
    "store_id",
    "permission",
    "context_name",
    "context_id",
    "delete",
];

fn permission_sheet_data(rows: Vec<Vec<Value>>) -> SheetData {
    sheet_data("user_permission", &PERMISSION_HEADERS, rows)
}

fn permission_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![permission_sheet_data(rows)]).unwrap()
}

/// Other cells blank.
fn permission_row(cells: &[(&str, &str)]) -> Vec<Value> {
    PERMISSION_HEADERS
        .iter()
        .map(
            |header| match cells.iter().find(|(column, _)| column == header) {
                Some((_, cell)) if !cell.is_empty() => Value::Text(cell.to_string()),
                _ => Value::Empty,
            },
        )
        .collect()
}

fn add_permission(
    connection: &StorageConnection,
    id: &str,
    user_id: &str,
    permission: PermissionType,
    context_id: Option<&str>,
) {
    UserPermissionRowRepository::new(connection)
        .upsert_one(&UserPermissionRow {
            id: id.to_string(),
            user_id: user_id.to_string(),
            store_id: Some("store_ms".to_string()),
            permission,
            context_id: context_id.map(str::to_string),
        })
        .unwrap();
}

/// (id, store id, permission, context id), in id order.
fn permissions_of(
    connection: &StorageConnection,
    user_id: &str,
) -> Vec<(String, String, PermissionType, Option<String>)> {
    let mut permissions: Vec<_> = repository::UserPermissionRepository::new(connection)
        .query_by_filter(
            repository::UserPermissionFilter::new()
                .user_id(EqualFilter::equal_to(user_id.to_string())),
        )
        .unwrap()
        .into_iter()
        .map(|p| {
            (
                p.id,
                p.store_id.unwrap_or_default(),
                p.permission,
                p.context_id,
            )
        })
        .collect();
    permissions.sort_by(|a, b| a.0.cmp(&b.0));
    permissions
}

/// (store id, default).
fn store_joins_of(connection: &StorageConnection, user_id: &str) -> Vec<(String, bool)> {
    let mut joins: Vec<_> = UserStoreJoinRowRepository::new(connection)
        .find_many_by_user_id(user_id)
        .unwrap()
        .into_iter()
        .map(|join| (join.store_id, join.is_default))
        .collect();
    joins.sort();
    joins
}

fn permissions_containing(contains: Option<&str>) -> ExportTable {
    ExportTable {
        table: CentralDataTable::UserPermission,
        filter: ExportFilter {
            contains: contains.map(str::to_string),
            ..Default::default()
        },
    }
}

/// `user_setup`, plus store MS, the Immunisation program and the patient context. On MS: Anna has store access, stocktake and documents in both contexts, plus an unknown
/// permission; Ben, deleted Carl and the setup admin each have one.
async fn permission_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (connection, service_provider, dir, _) = user_setup(name).await;
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "ms_name".to_string(),
            code: "MS".to_string(),
            name: "Main store".to_string(),
            r#type: NameRowType::Store,
            ..Default::default()
        })
        .unwrap();
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "store_ms".to_string(),
            code: "MS".to_string(),
            name_id: "ms_name".to_string(),
            ..Default::default()
        })
        .unwrap();
    for (id, name) in [("immunisation", "Immunisation"), ("Patient", "Patient")] {
        ContextRowRepository::new(&connection)
            .upsert_one(&ContextRow {
                id: id.to_string(),
                name: name.to_string(),
            })
            .unwrap();
    }
    let users = UserAccountRowRepository::new(&connection);
    for (id, deleted) in [("carl", true), ("admin", false)] {
        users
            .upsert_one(&UserAccountRow {
                id: id.to_string(),
                username: id.to_string(),
                deleted_datetime: deleted.then(|| datetime(2026, 1, 1)).flatten(),
                ..Default::default()
            })
            .unwrap();
    }
    KeyValueStoreRepository::new(&connection)
        .set_string(
            KeyType::StandaloneCentralAdminUserId,
            Some("admin".to_string()),
        )
        .unwrap();
    UserStoreJoinRowRepository::new(&connection)
        .upsert_one(&UserStoreJoinRow {
            id: "anna_store_ms".to_string(),
            user_id: "anna".to_string(),
            store_id: "store_ms".to_string(),
            is_default: false,
        })
        .unwrap();
    for (id, user_id, permission, context_id) in [
        ("anna_access", "anna", PermissionType::StoreAccess, None),
        (
            "anna_stocktake",
            "anna",
            PermissionType::StocktakeQuery,
            None,
        ),
        (
            "anna_documents",
            "anna",
            PermissionType::DocumentQuery,
            Some("immunisation"),
        ),
        (
            "anna_patients",
            "anna",
            PermissionType::DocumentQuery,
            Some("Patient"),
        ),
        (
            "anna_future",
            "anna",
            PermissionType::Unknown("FUTURE".to_string()),
            None,
        ),
        ("ben_report", "ben", PermissionType::Report, None),
        ("carl_report", "carl", PermissionType::Report, None),
        ("admin_report", "admin", PermissionType::Report, None),
    ] {
        add_permission(&connection, id, user_id, permission, context_id);
    }
    (connection, service_provider, dir)
}

// covers: OMS-REG-CDIO-01.10, .11, .152

#[actix_rt::test]
async fn user_permissions_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) =
        permission_setup("central_data_permission_round_trip").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let before = (
        permissions_of(&connection, "anna"),
        permissions_of(&connection, "admin"),
    );
    // Sorted in any letter case, so after anna.
    UserAccountRowRepository::new(&connection)
        .upsert_one(&UserAccountRow {
            username: "Ben".to_string(),
            ..ben()
        })
        .unwrap();

    let bytes = CentralDataService
        .export(&ctx, &[permissions_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let Ok(sheets) = sheet::read(&path, MAX_IMPORT_ROWS) else {
        panic!("the export reads back")
    };
    let sheet = &sheets[0];
    assert_eq!(
        sheet.headers,
        [PERMISSION_HEADERS.as_slice(), &["store_name"]].concat()
    );
    // The setup admin's, but not the unknown permission, Carl's or the importer's (no user row). By
    // username, store code, permission, then context name.
    let rows: Vec<&[String]> = sheet.rows.iter().map(|row| row.cells.as_slice()).collect();
    let row = |id, username, permission, context_name, context_id| {
        [
            id,
            username,
            username,
            "MS",
            "store_ms",
            permission,
            context_name,
            context_id,
            "",
            "Main store",
        ]
        .map(String::from)
    };
    assert_eq!(
        rows,
        [
            row("admin_report", "admin", "REPORT", "", ""),
            row(
                "anna_documents",
                "anna",
                "DOCUMENT_QUERY",
                "Immunisation",
                "immunisation"
            ),
            row(
                "anna_patients",
                "anna",
                "DOCUMENT_QUERY",
                "Patient",
                "Patient"
            ),
            row("anna_stocktake", "anna", "STOCKTAKE_QUERY", "", ""),
            row("anna_access", "anna", "STORE_ACCESS", "", ""),
            [
                "ben_report",
                "Ben",
                "ben",
                "MS",
                "store_ms",
                "REPORT",
                "",
                "",
                "",
                "Main store"
            ]
            .map(String::from),
        ]
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 6);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        (
            permissions_of(&connection, "anna"),
            permissions_of(&connection, "admin"),
        ),
        before
    );
}

// covers: OMS-REG-CDIO-01.46, .153

#[actix_rt::test]
async fn a_user_permission_export_searches_username_and_store_code() {
    let (_, service_provider, _) = permission_setup("central_data_permission_filter").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let count = |contains: Option<&str>| {
        CentralDataService
            .export_counts(&ctx, &[permissions_containing(contains)])
            .unwrap()[0]
            .count
    };

    // The setup admin's too.
    assert_eq!(
        count(None),
        RecordCount {
            matching: 6,
            total: 6
        }
    );
    assert_eq!(count(Some(" ANNA ")).matching, 4);
    assert_eq!(count(Some("ben")).matching, 1);
    assert_eq!(count(Some("admin")).matching, 1);
    assert_eq!(count(Some("ms")).matching, 6);
    // Not the store's name or the permission.
    assert_eq!(count(Some("Main")).matching, 0);
    assert_eq!(count(Some("REPORT")).matching, 0);
}

// covers: OMS-REG-CDIO-01.12, .25, .36, .154, .155, .211

#[actix_rt::test]
async fn user_permission_rows_add_and_delete_by_user_store_permission_and_context() {
    let (connection, service_provider, dir) =
        permission_setup("central_data_permission_upsert").await;
    let ctx = as_user(&service_provider, IMPORTER);

    let path = write_file(
        dir.path(),
        permission_sheet(vec![
            permission_row(&[("username", "anna")]),
            permission_row(&[("store_code", "MS"), ("permission", "REPORT")]),
            permission_row(&[
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "STOCKTAKE_QUERY"),
                ("delete", "x"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    // Every permission this server knows.
    let permissions: Vec<String> = PermissionType::known_iter()
        .map(|permission| permission.as_ref().to_string())
        .collect();
    let permission_required = format!(
        "permission is required for a new user permission and must be one of {}",
        permissions.join(", ")
    );
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("store_code"),
                "store_code is required for a new user permission"
            ),
            (2, Some("permission"), permission_required.as_str()),
            (
                3,
                Some("username"),
                "username is required for a new user permission"
            ),
            (
                4,
                Some("delete"),
                "\"x\" is not valid. Type DELETE to delete this row, or leave it blank"
            ),
        ]
    );

    let path = write_file(
        dir.path(),
        permission_sheet(vec![
            permission_row(&[
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "report"),
            ]),
            permission_row(&[
                ("username", "ANNA"),
                ("store_code", "MS"),
                ("permission", "STOCKTAKE_QUERY"),
            ]),
            permission_row(&[
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "DOCUMENT_QUERY"),
                ("context_name", "Immunisation"),
            ]),
            // Ben can now log in to MS.
            permission_row(&[
                ("username", "ben"),
                ("store_code", "MS"),
                ("permission", "STORE_ACCESS"),
            ]),
            // And Anna no longer can.
            permission_row(&[("id", "anna_access"), ("delete", "DELETE")]),
            // Already gone: unchanged.
            permission_row(&[("id", "gone"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        summary.tables,
        vec![TableChanges {
            table: CentralDataTable::UserPermission,
            inserted: 2,
            updated: 0,
            deleted: 1,
            unchanged: 3,
            error_count: 0,
        }]
    );
    assert_eq!(
        summary
            .changes
            .iter()
            .map(|change| (change.record.as_str(), change.change))
            .collect::<Vec<_>>(),
        [
            ("anna: REPORT in store MS", Change::Inserted),
            ("ben: STORE_ACCESS in store MS", Change::Inserted),
            ("anna: STORE_ACCESS in store MS", Change::Deleted),
        ]
    );
    // Without a context, the id sync and login give it.
    let report_id =
        UserPermissionRow::deterministic_id("anna", Some("store_ms"), &PermissionType::Report);
    let ids: Vec<String> = permissions_of(&connection, "anna")
        .into_iter()
        .map(|(id, ..)| id)
        .collect();
    let mut expected = vec![
        "anna_documents".to_string(),
        "anna_future".to_string(),
        "anna_patients".to_string(),
        "anna_stocktake".to_string(),
        report_id,
    ];
    expected.sort();
    assert_eq!(ids, expected);
    assert_eq!(
        store_joins_of(&connection, "anna"),
        [(mock_store_a().id, true)]
    );
    // Ben's first store, so his default.
    assert_eq!(
        store_joins_of(&connection, "ben"),
        [("store_ms".to_string(), true)]
    );
}

// covers: OMS-REG-CDIO-01.23, .24, .156

#[actix_rt::test]
async fn a_user_permission_finds_its_references_and_cannot_change_them() {
    let (connection, service_provider, dir) =
        permission_setup("central_data_permission_references").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let before = permissions_of(&connection, "anna");
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "store_wd".to_string(),
            code: "WD".to_string(),
            name_id: "ms_name".to_string(),
            ..Default::default()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        permission_sheet(vec![
            // By ids alone.
            permission_row(&[
                ("user_id", "anna"),
                ("store_id", "store_ms"),
                ("permission", "DOCUMENT_QUERY"),
                ("context_id", "Patient"),
            ]),
            // By name, the patient context too.
            permission_row(&[
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "DOCUMENT_QUERY"),
                ("context_name", "Patient"),
            ]),
            // Blank store keeps the saved one.
            permission_row(&[("id", "anna_stocktake"), ("username", "anna")]),
            // A DELETE row's blank context isn't compared.
            permission_row(&[
                ("id", "anna_documents"),
                ("username", "anna"),
                ("permission", "DOCUMENT_QUERY"),
                ("context_name", ""),
                ("context_id", ""),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].unchanged, summary.tables[0].deleted),
        (3, 1)
    );
    assert_eq!(
        summary.changes[0].record,
        "anna: DOCUMENT_QUERY for Immunisation in store MS"
    );

    let path = write_file(
        dir.path(),
        permission_sheet(vec![
            permission_row(&[
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "DOCUMENT_QUERY"),
                ("context_name", "Immunisation"),
                ("context_id", "Patient"),
            ]),
            permission_row(&[
                ("id", "anna_stocktake"),
                ("username", "ben"),
                ("store_code", "MS"),
                ("permission", "STOCKTAKE_QUERY"),
            ]),
            // A new id beside a saved key.
            permission_row(&[
                ("id", "copy"),
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "STOCKTAKE_QUERY"),
            ]),
            // A blank context is none.
            permission_row(&[
                ("id", "anna_documents"),
                ("username", "anna"),
                ("permission", "DOCUMENT_QUERY"),
                ("context_name", ""),
            ]),
            permission_row(&[
                ("username", "anna"),
                ("store_code", "XX"),
                ("permission", "REPORT"),
            ]),
            permission_row(&[
                ("id", "anna_stocktake"),
                ("username", "anna"),
                ("store_code", "WD"),
                ("permission", "STOCKTAKE_QUERY"),
            ]),
            permission_row(&[
                ("id", "anna_stocktake"),
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "REPORT"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("context_name"),
                "context_name and context_id conflict: Immunisation resolves to immunisation but context_id contains Patient"
            ),
            (
                3,
                Some("username"),
                "username and id conflict: anna: STOCKTAKE_QUERY in store MS has username anna and id anna_stocktake, but this row has username ben and id anna_stocktake"
            ),
            (
                4,
                Some("id"),
                "id conflict: anna: STOCKTAKE_QUERY in store MS has id anna_stocktake, but this row has id copy"
            ),
            (
                5,
                Some("context_id"),
                "context_id and id conflict: anna: DOCUMENT_QUERY for Immunisation in store MS has context_id immunisation and id anna_documents, but this row has a blank context_id and id anna_documents"
            ),
            (6, Some("store_code"), "store_code \"XX\" not found"),
            (
                7,
                Some("store_code"),
                "store_code and id conflict: anna: STOCKTAKE_QUERY in store MS has store_code MS and id anna_stocktake, but this row has store_code WD and id anna_stocktake"
            ),
            (
                8,
                Some("permission"),
                "permission and id conflict: anna: STOCKTAKE_QUERY in store MS has permission STOCKTAKE_QUERY and id anna_stocktake, but this row has permission REPORT and id anna_stocktake"
            ),
        ]
    );
    assert_eq!(permissions_of(&connection, "anna"), before);
}

// covers: OMS-REG-CDIO-01.157, .205

#[actix_rt::test]
async fn a_user_permission_row_can_give_the_setup_admin_a_permission_but_not_take_one_away() {
    let (connection, service_provider, dir) =
        permission_setup("central_data_permission_setup_admin").await;
    // MS is on this server's site, store_a on another.
    KeyValueStoreRepository::new(&connection)
        .set_i32(KeyType::SettingsSyncSiteId, Some(0))
        .unwrap();
    let ctx = as_user(&service_provider, IMPORTER);

    let path = write_file(
        dir.path(),
        permission_sheet(vec![permission_row(&[
            ("username", "admin"),
            ("store_code", "MS"),
            ("permission", "STOCKTAKE_QUERY"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].inserted, 1);
    assert_eq!(permissions_of(&connection, "admin").len(), 2);

    let path = write_file(
        dir.path(),
        permission_sheet(vec![
            permission_row(&[("id", "admin_report"), ("delete", "DELETE")]),
            permission_row(&[
                ("username", "admin"),
                ("store_code", "MS"),
                ("permission", "STOCKTAKE_QUERY"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let message =
        "admin is protected, as the server needs it, so import can't take away their permissions";
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("id"), message), (3, Some("username"), message)]
    );
    assert_eq!(permissions_of(&connection, "admin").len(), 2);

    // Their account isn't on store_a's site, so that site couldn't apply the record.
    let path = write_file(
        dir.path(),
        permission_sheet(vec![permission_row(&[
            ("username", "admin"),
            ("store_id", "store_a"),
            ("permission", "STOCKTAKE_QUERY"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("store_id"),
            "admin is only on this server, so import can't give them permissions in another site's store: code is on site 100"
        )]
    );
    assert_eq!(permissions_of(&connection, "admin").len(), 2);
}

// covers: OMS-REG-CDIO-01.157

#[actix_rt::test]
async fn a_user_permission_row_cannot_touch_a_server_user_or_deleted_user_or_lock_you_out() {
    let (connection, service_provider, dir) =
        permission_setup("central_data_permission_protected").await;
    grant_server_admin(&connection, "anna");
    add_permission(
        &connection,
        "anna_edit",
        "anna",
        PermissionType::EditCentralData,
        None,
    );
    // MS is Anna's only store on this site.
    KeyValueStoreRepository::new(&connection)
        .set_i32(KeyType::SettingsSyncSiteId, Some(0))
        .unwrap();
    let ctx = as_user(&service_provider, "anna");

    let path = write_file(
        dir.path(),
        permission_sheet(vec![
            permission_row(&[
                ("user_id", SYSTEM_USER_ID),
                ("store_code", "MS"),
                ("permission", "STOCKTAKE_QUERY"),
            ]),
            permission_row(&[
                ("username", "carl"),
                ("store_code", "MS"),
                ("permission", "STOCKTAKE_QUERY"),
            ]),
            permission_row(&[("id", "anna_server_admin"), ("delete", "DELETE")]),
            permission_row(&[("id", "anna_edit"), ("delete", "DELETE")]),
            permission_row(&[("id", "anna_access"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors = row_errors(&summary);
    // The users the server records its own work as get no permissions.
    assert_eq!((errors[0].0, errors[0].1), (2, Some("user_id")));
    assert!(
        errors[0].2.ends_with(
            "is protected, as the server needs it, so import can't change their permissions"
        ),
        "{}",
        errors[0].2
    );
    assert_eq!(
        errors[1..],
        [
            (
                3,
                Some("username"),
                "carl is deleted, so they can't be given a permission"
            ),
            (
                4,
                Some("delete"),
                "This is your last server-admin permission. You can't take it away, or you couldn't give it back"
            ),
            (
                5,
                Some("delete"),
                "This is your last central-data edit permission. You can't take it away, or you couldn't import again to give it back"
            ),
            (
                6,
                Some("delete"),
                "This is your access to your last store on this server. You can't take it away, or you couldn't log in again"
            ),
        ]
    );
    assert!(permissions_of(&connection, SYSTEM_USER_ID).is_empty());
    assert!(
        permissions_of(&connection, "anna")
            .iter()
            .any(|(id, ..)| id == "anna_server_admin")
    );
}

// covers: OMS-REG-CDIO-01.158

#[actix_rt::test]
async fn only_a_server_admin_can_import_or_export_user_permissions() {
    let (connection, service_provider, dir) =
        permission_setup("central_data_permission_admin_only").await;
    let ctx = as_user(&service_provider, "anna");
    assert!(matches!(
        CentralDataService.export(&ctx, &[permissions_containing(None)]),
        Err(ExportError::ServerAdminOnly)
    ));
    assert!(matches!(
        CentralDataService.export_counts(&ctx, &[permissions_containing(None)]),
        Err(ExportError::ServerAdminOnly)
    ));

    // Anna would give herself server admin.
    let path = write_file(
        dir.path(),
        permission_sheet(vec![permission_row(&[
            ("username", "anna"),
            ("store_code", "MS"),
            ("permission", "SERVER_ADMIN"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|error| (error.sheet.as_str(), error.row, error.message.as_str()))
        .collect();
    assert_eq!(
        errors,
        [(
            "user_permission",
            None,
            "Only a server admin can import this sheet"
        )]
    );
    assert!(
        !permissions_of(&connection, "anna")
            .iter()
            .any(|(_, _, permission, _)| *permission == PermissionType::ServerAdmin)
    );
}

// covers: OMS-REG-CDIO-01.159

#[actix_rt::test]
async fn a_user_permission_finds_a_user_the_user_sheet_adds() {
    let (connection, service_provider, dir) =
        permission_setup("central_data_permission_new_user").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let users = sheet_data(
        "user",
        &USER_HEADERS,
        vec![user_row("", "dina", &[(2, "secret"), (4, "ENGLISH")])],
    );
    let permissions = permission_sheet_data(vec![permission_row(&[
        ("username", "dina"),
        ("store_code", "MS"),
        ("permission", "STORE_ACCESS"),
    ])]);
    // Sheets run in table order, not file order.
    let path = write_file(dir.path(), sheet::write(vec![permissions, users]).unwrap());
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let dina = UserAccountRowRepository::new(&connection)
        .find_by_trimmed_username_any_case("dina")
        .unwrap()
        .remove(0);
    assert_eq!(
        store_joins_of(&connection, &dina.id),
        [("store_ms".to_string(), true)]
    );
    assert_eq!(permissions_of(&connection, &dina.id).len(), 1);
}

// covers: OMS-REG-CDIO-01.26, .155

#[actix_rt::test]
async fn a_delete_row_matches_a_permission_and_username_in_any_letter_case() {
    let (connection, service_provider, dir) =
        permission_setup("central_data_permission_delete_any_case").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let path = write_file(
        dir.path(),
        permission_sheet(vec![permission_row(&[
            ("id", "anna_stocktake"),
            ("username", "ANNA"),
            ("store_code", "MS"),
            ("permission", "stocktake_query"),
            ("delete", "DELETE"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 1);
    assert!(
        !permissions_of(&connection, "anna")
            .iter()
            .any(|(id, ..)| id == "anna_stocktake")
    );
}

// covers: OMS-REG-CDIO-01.36, .160

#[actix_rt::test]
async fn a_delete_row_with_a_missing_reference_applies_nothing() {
    let (connection, service_provider, dir) =
        permission_setup("central_data_permission_delete_missing_reference").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let before = permissions_of(&connection, "anna");
    let path = write_file(
        dir.path(),
        permission_sheet(vec![
            permission_row(&[("id", "anna_stocktake"), ("delete", "DELETE")]),
            permission_row(&[
                ("username", "nobody"),
                ("store_code", "MS"),
                ("permission", "REPORT"),
                ("delete", "DELETE"),
            ]),
            permission_row(&[
                ("username", "anna"),
                ("store_code", "NOPE"),
                ("permission", "REPORT"),
                ("delete", "DELETE"),
            ]),
            permission_row(&[
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "DOCUMENT_QUERY"),
                ("context_name", "No such program"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (3, Some("username"), "username \"nobody\" not found"),
            (4, Some("store_code"), "store_code \"NOPE\" not found"),
            (
                5,
                Some("context_name"),
                "context_name \"No such program\" not found"
            ),
        ]
    );
    // Row 2's delete is rolled back with the rest.
    assert_eq!(permissions_of(&connection, "anna"), before);
}

// covers: OMS-REG-CDIO-01.36

#[actix_rt::test]
async fn a_name_delete_row_with_a_missing_reference_applies_nothing() {
    let (connection, service_provider, dir) =
        name_setup("central_data_name_delete_missing_reference").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        name_sheet(vec![
            name_row(&[("id", "clinic"), ("delete", "DELETE")]),
            // Neither finds a name, but their references are looked up first.
            name_row(&[
                ("code", "GONE"),
                ("type", "FACILITY"),
                ("currency_code", "XXX"),
                ("delete", "DELETE"),
            ]),
            name_row(&[
                ("code", "GONE"),
                ("type", "FACILITY"),
                ("supplying_store_code", "NOPE"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (3, Some("currency_code"), "currency_code \"XXX\" not found"),
            (
                4,
                Some("supplying_store_code"),
                "supplying_store_code \"NOPE\" not found"
            ),
        ]
    );
    // Row 2's delete is rolled back with the rest.
    assert_eq!(find_name(&connection, "clinic"), Some(central_clinic()));
}

// User stores

const USER_STORE_HEADERS: [&str; 7] = [
    "id",
    "username",
    "user_id",
    "store_code",
    "store_id",
    "is_default",
    "delete",
];

fn user_store_sheet_data(rows: Vec<Vec<Value>>) -> SheetData {
    sheet_data("user_store_join", &USER_STORE_HEADERS, rows)
}

fn user_store_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![user_store_sheet_data(rows)]).unwrap()
}

/// Other cells blank.
fn user_store_row(cells: &[(&str, &str)]) -> Vec<Value> {
    USER_STORE_HEADERS
        .iter()
        .map(
            |header| match cells.iter().find(|(column, _)| column == header) {
                Some((_, cell)) if !cell.is_empty() => Value::Text(cell.to_string()),
                _ => Value::Empty,
            },
        )
        .collect()
}

fn user_stores_containing(contains: Option<&str>) -> ExportTable {
    ExportTable {
        table: CentralDataTable::UserStoreJoin,
        filter: ExportFilter {
            contains: contains.map(str::to_string),
            ..Default::default()
        },
    }
}

/// The stores the user has store access on, in order.
fn store_access_of(connection: &StorageConnection, user_id: &str) -> Vec<String> {
    let mut stores: Vec<_> = permissions_of(connection, user_id)
        .into_iter()
        .filter(|(_, _, permission, _)| *permission == PermissionType::StoreAccess)
        .map(|(_, store_id, ..)| store_id)
        .collect();
    stores.sort();
    stores
}

/// `permission_setup`: Anna has store a, her default, and MS; deleted Carl and the setup admin
/// have MS too. Each with store access there, as sync and login give it.
async fn user_store_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (connection, service_provider, dir) = permission_setup(name).await;
    for user_id in ["carl", "admin"] {
        UserStoreJoinRowRepository::new(&connection)
            .upsert_one(&UserStoreJoinRow {
                id: format!("{user_id}_store_ms"),
                user_id: user_id.to_string(),
                store_id: "store_ms".to_string(),
                is_default: true,
            })
            .unwrap();
        add_permission(
            &connection,
            &format!("{user_id}_access"),
            user_id,
            PermissionType::StoreAccess,
            None,
        );
    }
    UserPermissionRowRepository::new(&connection)
        .upsert_one(&UserPermissionRow {
            id: "anna_access_a".to_string(),
            user_id: "anna".to_string(),
            store_id: Some(mock_store_a().id),
            permission: PermissionType::StoreAccess,
            context_id: None,
        })
        .unwrap();
    (connection, service_provider, dir)
}

// covers: OMS-REG-CDIO-01.10, .11, .161

#[actix_rt::test]
async fn user_stores_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_round_trip").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let before = (
        store_joins_of(&connection, "anna"),
        store_joins_of(&connection, "admin"),
    );

    let bytes = CentralDataService
        .export(&ctx, &[user_stores_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let Ok(sheets) = sheet::read(&path, MAX_IMPORT_ROWS) else {
        panic!("the export reads back")
    };
    let sheet = &sheets[0];
    assert_eq!(sheet.name, "user_store_join");
    assert_eq!(
        sheet.headers,
        [USER_STORE_HEADERS.as_slice(), &["store_name"]].concat()
    );
    // The setup admin's, but not deleted Carl's. By username, then store code.
    let rows: Vec<&[String]> = sheet.rows.iter().map(|row| row.cells.as_slice()).collect();
    assert_eq!(
        rows,
        [
            [
                "admin_store_ms",
                "admin",
                "admin",
                "MS",
                "store_ms",
                "true",
                "",
                "Main store"
            ]
            .map(String::from),
            [
                "anna_store_ms",
                "anna",
                "anna",
                "MS",
                "store_ms",
                "false",
                "",
                "Main store"
            ]
            .map(String::from),
            [
                "anna_store_a",
                "anna",
                "anna",
                "code",
                "store_a",
                "true",
                "",
                "Store A"
            ]
            .map(String::from),
        ]
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 3);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        (
            store_joins_of(&connection, "anna"),
            store_joins_of(&connection, "admin"),
        ),
        before
    );
}

// covers: OMS-REG-CDIO-01.46, .162

#[actix_rt::test]
async fn a_user_store_export_searches_username_and_store_code() {
    let (connection, service_provider, _) =
        user_store_setup("central_data_user_store_filter").await;
    UserStoreJoinRowRepository::new(&connection)
        .upsert_one(&UserStoreJoinRow {
            id: "ben_store_ms".to_string(),
            user_id: "ben".to_string(),
            store_id: "store_ms".to_string(),
            is_default: true,
        })
        .unwrap();
    let ctx = as_user(&service_provider, IMPORTER);
    let count = |contains: Option<&str>| {
        CentralDataService
            .export_counts(&ctx, &[user_stores_containing(contains)])
            .unwrap()[0]
            .count
    };

    // The setup admin's join too, but not deleted Carl's.
    assert_eq!(
        count(None),
        RecordCount {
            matching: 4,
            total: 4
        }
    );
    assert_eq!(count(Some(" ANNA ")).matching, 2);
    assert_eq!(count(Some("admin")).matching, 1);
    assert_eq!(count(Some("ms")).matching, 3);
    // Not the store's name.
    assert_eq!(count(Some("Main")).matching, 0);
}

// covers: OMS-REG-CDIO-01.12, .25, .163, .164

#[actix_rt::test]
async fn user_store_rows_give_take_and_change_a_users_stores() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_upsert").await;
    let ctx = as_user(&service_provider, IMPORTER);

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[("username", "ben"), ("store_code", "MS")]),
            user_store_row(&[("store_code", "MS"), ("is_default", "TRUE")]),
            user_store_row(&[("id", "anna_store_ms"), ("is_default", "maybe")]),
            user_store_row(&[("id", "anna_store_ms"), ("delete", "Delete")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("is_default"),
                "is_default is required for a new user's store"
            ),
            (
                3,
                Some("username"),
                "username is required for a new user's store"
            ),
            (
                4,
                Some("is_default"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            ),
            (
                5,
                Some("delete"),
                "\"Delete\" is not valid. Type DELETE to delete this row, or leave it blank"
            ),
        ]
    );

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            // Ben can now log in to MS, his default.
            user_store_row(&[
                ("username", "BEN"),
                ("store_code", "MS"),
                ("is_default", "TRUE"),
            ]),
            // Anna no longer can.
            user_store_row(&[
                ("username", "anna"),
                ("store_code", "MS"),
                ("delete", "DELETE"),
            ]),
            // Store a is no longer her default.
            user_store_row(&[("id", "anna_store_a"), ("is_default", "FALSE")]),
            // Already gone: unchanged.
            user_store_row(&[("id", "gone"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        summary.tables,
        vec![TableChanges {
            table: CentralDataTable::UserStoreJoin,
            inserted: 1,
            updated: 1,
            deleted: 1,
            unchanged: 1,
            error_count: 0,
        }]
    );
    let changes: Vec<_> = summary
        .changes
        .iter()
        .map(|change| (change.record.as_str(), change.change, &change.fields))
        .collect();
    assert_eq!(
        changes,
        [
            ("ben in store MS", Change::Inserted, &vec![]),
            ("anna in store MS", Change::Deleted, &vec![]),
            (
                "anna in store code",
                Change::Updated,
                &vec![FieldChange {
                    column: "is_default",
                    from: "TRUE".to_string(),
                    to: "FALSE".to_string(),
                }]
            ),
        ]
    );
    assert_eq!(
        store_joins_of(&connection, "ben"),
        [("store_ms".to_string(), true)]
    );
    assert_eq!(store_access_of(&connection, "ben"), ["store_ms"]);
    assert_eq!(
        store_joins_of(&connection, "anna"),
        [(mock_store_a().id, false)]
    );
    // Her store access on MS is gone; her other permissions there are kept.
    assert_eq!(store_access_of(&connection, "anna"), [mock_store_a().id]);
    assert!(
        permissions_of(&connection, "anna")
            .iter()
            .any(|(id, ..)| id == "anna_stocktake")
    );
}

// covers: OMS-REG-CDIO-01.165

#[actix_rt::test]
async fn a_row_that_gives_a_user_a_second_default_store_is_a_row_error() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_default").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let before = store_joins_of(&connection, "anna");

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![user_store_row(&[
            ("id", "anna_store_ms"),
            ("is_default", "TRUE"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("is_default"),
            "MS would be anna's default store, and so would code, but a user has only one. Set is_default to FALSE for all but one"
        )]
    );
    // Counted only as an error.
    assert_eq!(
        (summary.tables[0].updated, summary.tables[0].error_count),
        (0, 1)
    );
    assert_eq!(store_joins_of(&connection, "anna"), before);

    // Moving it, in either order, leaves one.
    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[("id", "anna_store_ms"), ("is_default", "TRUE")]),
            user_store_row(&[("id", "anna_store_a"), ("is_default", "FALSE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        store_joins_of(&connection, "anna"),
        [(mock_store_a().id, false), ("store_ms".to_string(), true)]
    );

    // A user who already has two, as legacy mSupply can send them: a row that gives them another
    // store must leave them one.
    UserStoreJoinRowRepository::new(&connection)
        .upsert_one(&UserStoreJoinRow {
            id: "anna_store_a".to_string(),
            user_id: "anna".to_string(),
            store_id: mock_store_a().id,
            is_default: true,
        })
        .unwrap();
    let another_store = || {
        user_store_row(&[
            ("username", "anna"),
            ("store_id", "store_b"),
            ("is_default", "FALSE"),
        ])
    };
    let path = write_file(dir.path(), user_store_sheet(vec![another_store()]));
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("is_default"),
            "anna's default stores are MS and code, but a user has only one. Set is_default to FALSE for all but one"
        )]
    );
    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            another_store(),
            user_store_row(&[("id", "anna_store_a"), ("is_default", "FALSE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].updated),
        (1, 1)
    );
}

// covers: OMS-REG-CDIO-01.23, .24, .166

#[actix_rt::test]
async fn a_user_store_finds_its_references_and_cannot_change_them() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_references").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let before = store_joins_of(&connection, "anna");

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            // By ids alone.
            user_store_row(&[("user_id", "anna"), ("store_id", "store_ms")]),
            user_store_row(&[
                ("username", "anna"),
                ("user_id", "ben"),
                ("store_code", "MS"),
            ]),
            user_store_row(&[
                ("id", "anna_store_ms"),
                ("username", "ben"),
                ("store_code", "MS"),
            ]),
            user_store_row(&[
                ("id", "anna_store_ms"),
                ("username", "anna"),
                ("store_id", "store_a"),
            ]),
            // A new id beside a saved user and store.
            user_store_row(&[("id", "copy"), ("username", "anna"), ("store_code", "MS")]),
            user_store_row(&[
                ("username", "anna"),
                ("store_code", "XX"),
                ("is_default", "FALSE"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                3,
                Some("username"),
                "username and user_id conflict: anna resolves to anna but user_id contains ben"
            ),
            (
                4,
                Some("username"),
                "username and id conflict: anna in store MS has username anna and id anna_store_ms, but this row has username ben and id anna_store_ms"
            ),
            (
                5,
                Some("store_id"),
                "store_id and id conflict: anna in store MS has store_id store_ms and id anna_store_ms, but this row has store_id store_a and id anna_store_ms"
            ),
            (
                6,
                Some("id"),
                "id conflict: anna in store MS has id anna_store_ms, but this row has id copy"
            ),
            (7, Some("store_code"), "store_code \"XX\" not found"),
        ]
    );
    assert_eq!(summary.tables[0].unchanged, 1);
    assert_eq!(store_joins_of(&connection, "anna"), before);
}

// covers: OMS-REG-CDIO-01.167, .204

#[actix_rt::test]
async fn a_user_store_row_can_give_the_setup_admin_a_store_but_not_take_one_away() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_setup_admin").await;
    // store_a is on this server's site, store_b on another.
    KeyValueStoreRepository::new(&connection)
        .set_i32(KeyType::SettingsSyncSiteId, Some(mock_store_a().site_id))
        .unwrap();
    let ctx = as_user(&service_provider, IMPORTER);

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![user_store_row(&[
            ("username", "admin"),
            ("store_id", "store_a"),
            ("is_default", "FALSE"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].inserted, 1);
    // With store access there, so they can log in to it.
    assert_eq!(
        store_access_of(&connection, "admin"),
        [mock_store_a().id, "store_ms".to_string()]
    );

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[("id", "admin_store_ms"), ("delete", "DELETE")]),
            user_store_row(&[
                ("username", "admin"),
                ("store_id", "store_a"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let message =
        "admin is protected, as the server needs it, so import can't take away their stores";
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("id"), message), (3, Some("username"), message)]
    );
    assert_eq!(store_joins_of(&connection, "admin").len(), 2);

    // Their account isn't on store_b's site, so that site couldn't apply the record.
    let path = write_file(
        dir.path(),
        user_store_sheet(vec![user_store_row(&[
            ("username", "admin"),
            ("store_id", "store_b"),
            ("is_default", "FALSE"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("store_id"),
            "admin is only on this server, so import can't give them stores in another site's store: code is on site 2"
        )]
    );
    assert_eq!(store_joins_of(&connection, "admin").len(), 2);

    // One they already have there is refused only when the row changes it.
    UserStoreJoinRowRepository::new(&connection)
        .upsert_one(&UserStoreJoinRow {
            id: "admin_store_b".to_string(),
            user_id: "admin".to_string(),
            store_id: "store_b".to_string(),
            is_default: false,
        })
        .unwrap();
    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[
                ("username", "admin"),
                ("store_id", "store_b"),
                ("is_default", "FALSE"),
            ]),
            user_store_row(&[("id", "admin_store_b"), ("is_default", "TRUE")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            3,
            Some("store_id"),
            "admin is only on this server, so import can't give them stores in another site's store: code is on site 2"
        )]
    );
    assert_eq!(summary.tables[0].unchanged, 1);
}

// covers: OMS-REG-CDIO-01.167

#[actix_rt::test]
async fn a_user_store_row_cannot_touch_a_server_user_give_a_deleted_user_a_store_or_lock_you_out() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_protected").await;
    grant_server_admin(&connection, "anna");
    // MS is Anna's only store on this site.
    KeyValueStoreRepository::new(&connection)
        .set_i32(KeyType::SettingsSyncSiteId, Some(0))
        .unwrap();
    let ctx = as_user(&service_provider, "anna");

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[
                ("user_id", SYSTEM_USER_ID),
                ("store_id", "store_a"),
                ("is_default", "FALSE"),
            ]),
            user_store_row(&[
                ("user_id", PLUGIN_USER_ID),
                ("store_id", "store_a"),
                ("is_default", "FALSE"),
            ]),
            user_store_row(&[
                ("username", "carl"),
                ("store_id", "store_a"),
                ("is_default", "FALSE"),
            ]),
            user_store_row(&[("id", "anna_store_ms"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors = row_errors(&summary);
    assert_eq!(
        errors[2..],
        [
            (
                4,
                Some("username"),
                "carl is deleted, so they can't be given a store"
            ),
            (
                5,
                Some("delete"),
                "This is your last store on this server. You can't take it away, or you couldn't log in again"
            ),
        ]
    );
    // The users the server records its own work as get no stores.
    for (error, row) in errors[..2].iter().zip([2, 3]) {
        assert_eq!((error.0, error.1), (row, Some("user_id")));
        assert!(
            error.2.ends_with(
                "is protected, as the server needs it, so import can't change their stores"
            ),
            "{}",
            error.2
        );
    }
    assert_eq!(store_joins_of(&connection, SYSTEM_USER_ID).len(), 0);
    assert_eq!(store_joins_of(&connection, "carl").len(), 1);
    assert_eq!(store_joins_of(&connection, "anna").len(), 2);
}

// covers: OMS-REG-CDIO-01.171

#[actix_rt::test]
async fn a_deleted_users_store_is_kept_and_a_row_can_change_or_remove_it() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_deleted_user").await;
    let ctx = as_user(&service_provider, IMPORTER);
    UserStoreJoinRowRepository::new(&connection)
        .upsert_one(&UserStoreJoinRow {
            id: "carl_store_a".to_string(),
            user_id: "carl".to_string(),
            store_id: mock_store_a().id,
            is_default: false,
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[("id", "carl_store_a")]),
            user_store_row(&[("id", "carl_store_ms"), ("is_default", "FALSE")]),
            user_store_row(&[("id", "carl_store_a"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    // Rows that find a deleted user's record, changed or not, aren't errors.
    assert_eq!(summary.errors, vec![]);

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[("id", "carl_store_ms"), ("is_default", "FALSE")]),
            user_store_row(&[
                ("username", "carl"),
                ("store_id", "store_a"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        (summary.tables[0].updated, summary.tables[0].deleted),
        (1, 1)
    );
    assert_eq!(
        store_joins_of(&connection, "carl"),
        [("store_ms".to_string(), false)]
    );
}

// covers: OMS-REG-CDIO-01.172

#[actix_rt::test]
async fn a_store_a_row_writes_must_come_with_store_access_once_the_file_has_run() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_needs_access").await;
    let ctx = as_user(&service_provider, IMPORTER);
    // Made by hand, without store access.
    UserStoreJoinRowRepository::new(&connection)
        .upsert_one(&UserStoreJoinRow {
            id: "ben_store_ms".to_string(),
            user_id: "ben".to_string(),
            store_id: "store_ms".to_string(),
            is_default: false,
        })
        .unwrap();
    let make_default = || user_store_row(&[("id", "ben_store_ms"), ("is_default", "TRUE")]);

    // A row that leaves it as it is isn't checked.
    let path = write_file(
        dir.path(),
        user_store_sheet(vec![user_store_row(&[("id", "ben_store_ms")])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(summary.errors, vec![]);

    let path = write_file(dir.path(), user_store_sheet(vec![make_default()]));
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("store_code"),
            "ben has no store access on MS, so they couldn't log in to it. Add a STORE_ACCESS row for it on the user_permission sheet"
        )]
    );
    assert_eq!(summary.tables[0].updated, 0);
    assert_eq!(
        store_joins_of(&connection, "ben"),
        [("store_ms".to_string(), false)]
    );

    // With the store access in the same file, it imports.
    let access = permission_sheet_data(vec![permission_row(&[
        ("username", "ben"),
        ("store_code", "MS"),
        ("permission", "STORE_ACCESS"),
    ])]);
    let path = write_file(
        dir.path(),
        sheet::write(vec![user_store_sheet_data(vec![make_default()]), access]).unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        store_joins_of(&connection, "ben"),
        [("store_ms".to_string(), true)]
    );
    assert_eq!(store_access_of(&connection, "ben"), ["store_ms"]);

    // A later sheet taking the store access away would take the store with it.
    let path = write_file(
        dir.path(),
        sheet::write(vec![
            user_store_sheet_data(vec![user_store_row(&[
                ("username", "dina"),
                ("store_code", "MS"),
                ("is_default", "TRUE"),
            ])]),
            sheet_data(
                "user",
                &USER_HEADERS,
                vec![user_row("dina", "dina", &[(2, "secret"), (4, "ENGLISH")])],
            ),
            permission_sheet_data(vec![permission_row(&[
                ("username", "dina"),
                ("store_code", "MS"),
                ("permission", "STORE_ACCESS"),
                ("delete", "DELETE"),
            ])]),
        ])
        .unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("store_code"),
            "This row gives dina store MS, but the user_permission sheet takes their STORE_ACCESS there away, which takes the store away too. Clear that row's DELETE, or mark this row DELETE"
        )]
    );
    assert_eq!(find_user(&connection, "dina"), None);
}

// covers: OMS-REG-CDIO-01.173

#[actix_rt::test]
async fn a_user_store_delete_row_the_user_permission_sheet_would_undo_is_a_row_error() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_delete_undone").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let before = store_joins_of(&connection, "anna");
    let file = |access_delete: &str| {
        sheet::write(vec![
            user_store_sheet_data(vec![user_store_row(&[
                ("id", "anna_store_ms"),
                ("username", "anna"),
                ("store_code", "MS"),
                ("delete", "DELETE"),
            ])]),
            // As exported: her store access on MS, left as it is or marked DELETE.
            permission_sheet_data(vec![permission_row(&[
                ("id", "anna_access"),
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "STORE_ACCESS"),
                ("delete", access_delete),
            ])]),
        ])
        .unwrap()
    };

    let path = write_file(dir.path(), file(""));
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("delete"),
            "This row takes MS away from anna, but the user_permission sheet gives them STORE_ACCESS there, which gives it back. Mark that row DELETE too, or remove it from the file"
        )]
    );
    assert_eq!(summary.tables[0].deleted, 0);
    assert_eq!(store_joins_of(&connection, "anna"), before);

    // Taking both away agrees.
    let path = write_file(dir.path(), file("DELETE"));
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        store_joins_of(&connection, "anna"),
        [(mock_store_a().id, true)]
    );
    assert_eq!(store_access_of(&connection, "anna"), [mock_store_a().id]);
}

// covers: OMS-REG-CDIO-01.174

#[actix_rt::test]
async fn deleting_one_of_two_duplicate_user_stores_keeps_the_store() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_duplicate").await;
    let ctx = as_user(&service_provider, IMPORTER);
    // A duplicate, as legacy mSupply can send.
    UserStoreJoinRowRepository::new(&connection)
        .upsert_one(&UserStoreJoinRow {
            id: "anna_store_ms_again".to_string(),
            user_id: "anna".to_string(),
            store_id: "store_ms".to_string(),
            is_default: false,
        })
        .unwrap();

    // Her store access on MS left as it is: the duplicate keeps it, so it's no contradiction.
    let path = write_file(
        dir.path(),
        sheet::write(vec![
            user_store_sheet_data(vec![user_store_row(&[
                ("id", "anna_store_ms_again"),
                ("delete", "DELETE"),
            ])]),
            permission_sheet_data(vec![permission_row(&[
                ("id", "anna_access"),
                ("username", "anna"),
                ("store_code", "MS"),
                ("permission", "STORE_ACCESS"),
            ])]),
        ])
        .unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 1);
    assert_eq!(
        store_joins_of(&connection, "anna"),
        [(mock_store_a().id, true), ("store_ms".to_string(), false)]
    );
    assert!(store_access_of(&connection, "anna").contains(&"store_ms".to_string()));
}

// covers: OMS-REG-CDIO-01.21

#[actix_rt::test]
async fn a_store_a_later_row_deletes_is_blamed_on_that_row_alone() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_update_then_delete").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let before = store_joins_of(&connection, "anna");
    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[("id", "anna_store_ms"), ("is_default", "TRUE")]),
            user_store_row(&[("id", "anna_store_ms"), ("delete", "DELETE")]),
            user_store_row(&[("id", "anna_store_a"), ("is_default", "FALSE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    // Not that another sheet took the store away: the file has no other sheet.
    assert_eq!(
        row_errors(&summary),
        vec![(3, None, "Row 2 already changes this record")]
    );
    assert_eq!(store_joins_of(&connection, "anna"), before);
}

// covers: OMS-REG-CDIO-01.173

#[actix_rt::test]
async fn a_store_a_later_row_gives_back_is_not_blamed_on_another_sheet() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_delete_then_add").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[("id", "anna_store_ms"), ("delete", "DELETE")]),
            user_store_row(&[
                ("username", "anna"),
                ("store_code", "MS"),
                ("is_default", "FALSE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    // The file has no user_permission sheet to blame: the later row gives the store back.
    assert_eq!(summary.errors, vec![]);
    // Through a new record: the first row deleted hers.
    assert_eq!(
        UserStoreJoinRowRepository::new(&connection)
            .find_one_by_id("anna_store_ms")
            .unwrap(),
        None
    );
    assert_eq!(
        store_joins_of(&connection, "anna"),
        [(mock_store_a().id, true), ("store_ms".to_string(), false)]
    );
    assert!(store_access_of(&connection, "anna").contains(&"store_ms".to_string()));
}

// covers: OMS-REG-CDIO-01.168

#[actix_rt::test]
async fn only_a_server_admin_can_import_or_export_user_stores() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_admin_only").await;
    let ctx = as_user(&service_provider, "ben");
    assert!(matches!(
        CentralDataService.export(&ctx, &[user_stores_containing(None)]),
        Err(ExportError::ServerAdminOnly)
    ));
    assert!(matches!(
        CentralDataService.export_counts(&ctx, &[user_stores_containing(None)]),
        Err(ExportError::ServerAdminOnly)
    ));

    let path = write_file(
        dir.path(),
        user_store_sheet(vec![user_store_row(&[
            ("username", "ben"),
            ("store_code", "MS"),
            ("is_default", "TRUE"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|error| (error.sheet.as_str(), error.row, error.message.as_str()))
        .collect();
    assert_eq!(
        errors,
        [(
            "user_store_join",
            None,
            "Only a server admin can import this sheet"
        )]
    );
    assert_eq!(store_joins_of(&connection, "ben"), []);
}

// covers: OMS-REG-CDIO-01.36, .169

#[actix_rt::test]
async fn a_user_store_delete_row_with_a_missing_reference_applies_nothing() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_delete_missing_reference").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let before = store_joins_of(&connection, "anna");
    let path = write_file(
        dir.path(),
        user_store_sheet(vec![
            user_store_row(&[("id", "anna_store_ms"), ("delete", "DELETE")]),
            user_store_row(&[
                ("username", "nobody"),
                ("store_code", "MS"),
                ("delete", "DELETE"),
            ]),
            user_store_row(&[
                ("username", "anna"),
                ("store_code", "NOPE"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (3, Some("username"), "username \"nobody\" not found"),
            (4, Some("store_code"), "store_code \"NOPE\" not found"),
        ]
    );
    // Row 2's delete is rolled back with the rest.
    assert_eq!(store_joins_of(&connection, "anna"), before);
}

// covers: OMS-REG-CDIO-01.163, .170

#[actix_rt::test]
async fn a_user_store_finds_a_user_the_user_sheet_adds_who_can_then_log_in() {
    let (connection, service_provider, dir) =
        user_store_setup("central_data_user_store_new_user").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let users = sheet_data(
        "user",
        &USER_HEADERS,
        vec![user_row("", "dina", &[(2, "secret"), (4, "ENGLISH")])],
    );
    let stores = user_store_sheet_data(vec![user_store_row(&[
        ("username", "dina"),
        ("store_code", "MS"),
        ("is_default", "TRUE"),
    ])]);
    // A permission row for the store access the join gives finds it.
    let permissions = permission_sheet_data(vec![permission_row(&[
        ("username", "dina"),
        ("store_code", "MS"),
        ("permission", "STORE_ACCESS"),
    ])]);
    // Sheets run in table order, not file order.
    let path = write_file(
        dir.path(),
        sheet::write(vec![permissions, stores, users]).unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let counts: Vec<_> = summary
        .tables
        .iter()
        .map(|table| (table.table, table.inserted, table.unchanged))
        .collect();
    assert_eq!(
        counts,
        [
            (CentralDataTable::User, 1, 0),
            (CentralDataTable::UserStoreJoin, 1, 0),
            (CentralDataTable::UserPermission, 0, 1),
        ]
    );
    let dina = UserAccountRowRepository::new(&connection)
        .find_by_trimmed_username_any_case("dina")
        .unwrap()
        .remove(0);
    // Login offers her MS, and her store access lets her in.
    KeyValueStoreRepository::new(&connection)
        .set_i32(KeyType::SettingsSyncSiteId, Some(0))
        .unwrap();
    let user = UserAccountService::new(&connection)
        .find_user_active_on_this_site(&dina.id)
        .unwrap()
        .unwrap();
    let offered: Vec<_> = user
        .stores
        .iter()
        .map(|store| store.store_row.id.as_str())
        .collect();
    assert_eq!(offered, ["store_ms"]);
    assert_eq!(store_access_of(&connection, &dina.id), ["store_ms"]);
}

// Master list lines

const LINE_HEADERS: [&str; 7] = [
    "id",
    "master_list_name",
    "master_list_id",
    "item_code",
    "item_id",
    "price_per_unit",
    "delete",
];

fn line_sheet_data(rows: Vec<Vec<Value>>) -> SheetData {
    sheet_data("master_list_line", &LINE_HEADERS, rows)
}

fn line_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![line_sheet_data(rows)]).unwrap()
}

/// A row of `LINE_HEADERS` with the given cells; the others are blank.
fn line_row(cells: &[(&str, &str)]) -> Vec<Value> {
    LINE_HEADERS
        .iter()
        .map(
            |header| match cells.iter().find(|(column, _)| column == header) {
                Some((_, cell)) if !cell.is_empty() => Value::Text(cell.to_string()),
                _ => Value::Empty,
            },
        )
        .collect()
}

fn add_line(
    connection: &StorageConnection,
    id: &str,
    master_list_id: &str,
    item_id: &str,
    price_per_unit: Option<f64>,
) {
    MasterListLineRowRepository::new(connection)
        .upsert_one(&MasterListLineRow {
            id: id.to_string(),
            master_list_id: master_list_id.to_string(),
            price_per_unit,
            item_id: item_id.to_string(),
        })
        .unwrap();
}

/// Each of the master list's lines, as (id, item id, price), in id order.
fn lines_of(
    connection: &StorageConnection,
    master_list_id: &str,
) -> Vec<(String, String, Option<f64>)> {
    MasterListLineRepository::new(connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(master_list_id.to_string())),
            None,
        )
        .unwrap()
        .into_iter()
        .map(|line| (line.id, line.item_id, line.price_per_unit))
        .collect()
}

fn lines_containing(contains: Option<&str>) -> ExportTable {
    ExportTable {
        table: CentralDataTable::MasterListLine,
        filter: ExportFilter {
            contains: contains.map(str::to_string),
            ..Default::default()
        },
    }
}

/// `item_setup`, with Ibuprofen, the master lists Essential medicines and Clinic list, and lines
/// putting Paracetamol on both, Ibuprofen on Essential medicines, and Ibuprofen on the placeholder
/// master list.
async fn line_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (connection, service_provider, dir) = item_setup(name).await;
    ItemRowRepository::new(&connection)
        .upsert_one(&ItemRow {
            id: "ibuprofen".to_string(),
            code: "IBU".to_string(),
            name: "Ibuprofen".to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap();
    let master_lists = MasterListRowRepository::new(&connection);
    master_lists.upsert_one(&essential_medicines()).unwrap();
    master_lists
        .upsert_one(&MasterListRow {
            id: "clinic".to_string(),
            name: "Clinic list".to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap();
    add_line(
        &connection,
        "line_eml_para",
        "eml",
        "paracetamol",
        Some(2.5),
    );
    add_line(&connection, "line_eml_ibu", "eml", "ibuprofen", None);
    add_line(
        &connection,
        "line_clinic_para",
        "clinic",
        "paracetamol",
        Some(3.0),
    );
    add_line(
        &connection,
        "line_missing",
        MISSING_PROGRAM,
        "ibuprofen",
        None,
    );
    (connection, service_provider, dir)
}

// covers: OMS-REG-CDIO-01.10, .11, .175, .180

#[actix_rt::test]
async fn master_list_lines_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) = line_setup("central_data_line_round_trip").await;
    let ctx = service_provider.basic_context().unwrap();
    // A lower-case name, which sorts after Essential medicines when letter case counts.
    MasterListRowRepository::new(&connection)
        .upsert_one(&MasterListRow {
            id: "antenatal".to_string(),
            name: "antenatal".to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap();
    add_line(
        &connection,
        "line_antenatal_para",
        "antenatal",
        "paracetamol",
        None,
    );
    let before = (
        lines_of(&connection, "antenatal"),
        lines_of(&connection, "eml"),
        lines_of(&connection, "clinic"),
    );

    let bytes = CentralDataService
        .export(&ctx, &[lines_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let Ok(sheets) = sheet::read(&path, MAX_IMPORT_ROWS) else {
        panic!("the export reads back")
    };
    let sheet = &sheets[0];
    assert_eq!(
        sheet.headers,
        [LINE_HEADERS.as_slice(), &["item_name"]].concat()
    );
    // By master list name in any letter case, then item code; not the placeholder master list's.
    let rows: Vec<&[String]> = sheet.rows.iter().map(|row| row.cells.as_slice()).collect();
    assert_eq!(
        rows,
        [
            [
                "line_antenatal_para",
                "antenatal",
                "antenatal",
                "PARA",
                "paracetamol",
                "",
                "",
                "Paracetamol"
            ],
            [
                "line_clinic_para",
                "Clinic list",
                "clinic",
                "PARA",
                "paracetamol",
                "3",
                "",
                "Paracetamol"
            ],
            [
                "line_eml_ibu",
                "Essential medicines",
                "eml",
                "IBU",
                "ibuprofen",
                "",
                "",
                "Ibuprofen"
            ],
            [
                "line_eml_para",
                "Essential medicines",
                "eml",
                "PARA",
                "paracetamol",
                "2.5",
                "",
                "Paracetamol"
            ],
        ]
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 4);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        (
            lines_of(&connection, "antenatal"),
            lines_of(&connection, "eml"),
            lines_of(&connection, "clinic")
        ),
        before
    );
}

// covers: OMS-REG-CDIO-01.46, .176

#[actix_rt::test]
async fn a_master_list_line_export_searches_master_list_name_and_item_code() {
    let (_, service_provider, _) = line_setup("central_data_line_filter").await;
    let ctx = service_provider.basic_context().unwrap();
    let count = |contains: Option<&str>| {
        CentralDataService
            .export_counts(&ctx, &[lines_containing(contains)])
            .unwrap()[0]
            .count
    };

    assert_eq!(
        count(None),
        RecordCount {
            matching: 3,
            total: 3
        }
    );
    assert_eq!(count(Some(" para ")).matching, 2);
    assert_eq!(count(Some("essential")).matching, 2);
    assert_eq!(count(Some("clinic")).matching, 1);
    // Not the placeholder master list's line, whose item has the code too: the search's two
    // sides are grouped, so the placeholder is left out whichever side matches.
    assert_eq!(count(Some("IBU")).matching, 1);
    // Not the item's name, nor the master list's code.
    assert_eq!(count(Some("ibuprofen")).matching, 0);
    assert_eq!(count(Some("EML")).matching, 0);
}

// covers: OMS-REG-CDIO-01.12, .25, .26, .36, .55, .177

#[actix_rt::test]
async fn master_list_line_rows_add_update_and_delete_by_master_list_and_item() {
    let (connection, service_provider, dir) = line_setup("central_data_line_upsert").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        line_sheet(vec![
            line_row(&[("master_list_name", "Clinic list")]),
            line_row(&[("item_code", "IBU"), ("price_per_unit", "1.5")]),
            line_row(&[
                ("master_list_name", "Clinic list"),
                ("item_code", "PARA"),
                ("delete", "delete"),
            ]),
            line_row(&[
                ("master_list_name", "Clinic list"),
                ("item_code", "IBU"),
                ("price_per_unit", "cheap"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("item_code"),
                "item_code is required for a new master list line"
            ),
            (
                3,
                Some("master_list_name"),
                "master_list_name is required for a new master list line"
            ),
            (
                4,
                Some("delete"),
                "\"delete\" is not valid. Type DELETE to delete this row, or leave it blank"
            ),
            (5, Some("price_per_unit"), "\"cheap\" must be a number"),
        ]
    );

    let path = write_file(
        dir.path(),
        line_sheet(vec![
            // A new line, with no price.
            line_row(&[("master_list_name", "Clinic list"), ("item_code", "IBU")]),
            // No id: found by its master list and item.
            line_row(&[
                ("master_list_name", "Essential medicines"),
                ("item_code", "PARA"),
                ("price_per_unit", "2.75"),
            ]),
            line_row(&[
                ("id", "line_clinic_para"),
                ("master_list_name", "Clinic list"),
                ("item_code", "PARA"),
                ("price_per_unit", "3"),
                ("delete", "DELETE"),
            ]),
            // Already gone: unchanged.
            line_row(&[("id", "gone"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        summary.tables,
        vec![TableChanges {
            table: CentralDataTable::MasterListLine,
            inserted: 1,
            updated: 1,
            deleted: 1,
            unchanged: 1,
            error_count: 0,
        }]
    );
    assert_eq!(
        summary
            .changes
            .iter()
            .map(|change| (change.record.as_str(), change.change))
            .collect::<Vec<_>>(),
        [
            ("Ibuprofen (IBU) on Clinic list", Change::Inserted),
            ("Paracetamol (PARA) on Essential medicines", Change::Updated),
            ("Paracetamol (PARA) on Clinic list", Change::Deleted),
        ]
    );
    assert_eq!(
        summary.changes[1].fields,
        vec![FieldChange {
            column: "price_per_unit",
            from: "2.5".to_string(),
            to: "2.75".to_string(),
        }]
    );
    let clinic = lines_of(&connection, "clinic");
    assert_eq!(clinic.len(), 1);
    assert_eq!((clinic[0].1.as_str(), clinic[0].2), ("ibuprofen", None));
    assert_eq!(
        lines_of(&connection, "eml"),
        [
            ("line_eml_ibu".to_string(), "ibuprofen".to_string(), None),
            (
                "line_eml_para".to_string(),
                "paracetamol".to_string(),
                Some(2.75)
            ),
        ]
    );

    // A blank price clears it; a DELETE row may keep the saved values, but not change them.
    let path = write_file(
        dir.path(),
        line_sheet(vec![
            line_row(&[("id", "line_eml_para"), ("price_per_unit", "")]),
            line_row(&[
                ("master_list_name", "Essential medicines"),
                ("item_code", "IBU"),
                ("price_per_unit", "4"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            3,
            Some("delete"),
            "A row marked DELETE can't also change price_per_unit. Clear it or put back the saved value"
        )]
    );
    assert_eq!(summary.tables[0].updated, 1);
}

// covers: OMS-REG-CDIO-01.183

#[actix_rt::test]
async fn a_master_list_line_price_cannot_be_negative() {
    let (connection, service_provider, dir) = line_setup("central_data_line_negative_price").await;
    let ctx = service_provider.basic_context().unwrap();
    // A saved negative price, as legacy mSupply could send it.
    add_line(
        &connection,
        "line_clinic_ibu",
        "clinic",
        "ibuprofen",
        Some(-1.0),
    );

    let path = write_file(
        dir.path(),
        line_sheet(vec![
            line_row(&[("id", "line_eml_para"), ("price_per_unit", "-0.5")]),
            // 0 is a price.
            line_row(&[("id", "line_eml_ibu"), ("price_per_unit", "0")]),
            // A saved negative price stays editable while the row leaves it as it is.
            line_row(&[
                ("id", "line_clinic_ibu"),
                ("master_list_name", "Clinic list"),
                ("price_per_unit", "-1"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("price_per_unit"),
            "price_per_unit can't be negative"
        )]
    );
    assert_eq!(
        (summary.tables[0].updated, summary.tables[0].unchanged),
        (1, 1)
    );
}

// covers: OMS-REG-CDIO-01.184

#[actix_rt::test]
async fn two_saved_lines_for_one_master_list_and_item_are_found_by_id() {
    let (connection, service_provider, dir) = line_setup("central_data_line_shared_pair").await;
    let ctx = service_provider.basic_context().unwrap();
    // A line for another item, merged into Paracetamol since: both lines now hold Paracetamol.
    ItemRowRepository::new(&connection)
        .upsert_one(&ItemRow {
            id: "old_para".to_string(),
            code: "PARA-OLD".to_string(),
            name: "Paracetamol (old)".to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap();
    add_line(
        &connection,
        "line_eml_old_para",
        "eml",
        "old_para",
        Some(3.0),
    );
    ItemLinkRowRepository::new(&connection)
        .upsert_one(&ItemLinkRow {
            id: "old_para".to_string(),
            item_id: "paracetamol".to_string(),
        })
        .unwrap();
    let ids = |connection: &StorageConnection| -> Vec<(String, String)> {
        lines_of(connection, "eml")
            .into_iter()
            .map(|(id, item_id, _)| (id, item_id))
            .collect()
    };
    let shared = |id: &str| (id.to_string(), "paracetamol".to_string());
    assert_eq!(
        ids(&connection),
        [
            ("line_eml_ibu".to_string(), "ibuprofen".to_string()),
            shared("line_eml_old_para"),
            shared("line_eml_para"),
        ]
    );

    // An export writes both, and imports unchanged.
    let bytes = CentralDataService
        .export(&ctx, &[lines_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 4);

    let path = write_file(
        dir.path(),
        line_sheet(vec![
            // Without an id, the pair finds both.
            line_row(&[
                ("master_list_name", "Essential medicines"),
                ("item_code", "PARA"),
                ("price_per_unit", "9"),
            ]),
            line_row(&[
                ("master_list_name", "Essential medicines"),
                ("item_code", "PARA"),
                ("delete", "DELETE"),
            ]),
            // With one, it settles which.
            line_row(&[
                ("id", "line_eml_old_para"),
                ("master_list_name", "Essential medicines"),
                ("item_code", "PARA"),
                ("price_per_unit", "4"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    let ambiguous = "ambiguous reference, please provide id instead";
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("id"), ambiguous), (3, Some("id"), ambiguous)]
    );
    assert_eq!(summary.tables[0].updated, 1);

    // A DELETE row with an id removes that line alone.
    let path = write_file(
        dir.path(),
        line_sheet(vec![line_row(&[
            ("id", "line_eml_old_para"),
            ("delete", "DELETE"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 1);
    assert_eq!(
        ids(&connection),
        [
            ("line_eml_ibu".to_string(), "ibuprofen".to_string()),
            shared("line_eml_para"),
        ]
    );
}

// covers: OMS-REG-CDIO-01.24, .39, .178, .179

#[actix_rt::test]
async fn a_master_list_line_finds_its_references_and_cannot_change_them() {
    let (connection, service_provider, dir) = line_setup("central_data_line_references").await;
    let ctx = service_provider.basic_context().unwrap();
    // An inactive list with an active one's name doesn't make the name ambiguous; two active
    // ones sharing a name, as legacy mSupply can send them, do.
    let master_lists = MasterListRowRepository::new(&connection);
    master_lists
        .upsert_one(&MasterListRow {
            id: "old_clinic".to_string(),
            name: "Clinic list".to_string(),
            is_active: false,
            ..Default::default()
        })
        .unwrap();
    for id in ["ward_a", "ward_b"] {
        master_lists
            .upsert_one(&MasterListRow {
                id: id.to_string(),
                name: "Ward list".to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();
    }

    let path = write_file(
        dir.path(),
        line_sheet(vec![
            line_row(&[("master_list_name", "Nope"), ("item_code", "IBU")]),
            line_row(&[("master_list_name", "Ward list"), ("item_code", "IBU")]),
            line_row(&[("master_list_id", "clinic"), ("item_code", "NOPE")]),
            line_row(&[
                ("id", "line_eml_para"),
                ("master_list_name", "Clinic list"),
                ("item_code", "PARA"),
            ]),
            line_row(&[("id", "line_eml_para"), ("item_id", "ibuprofen")]),
            line_row(&[
                ("id", "copied"),
                ("master_list_name", "Essential medicines"),
                ("item_code", "PARA"),
            ]),
            line_row(&[
                ("master_list_name", "Clinic list"),
                ("item_code", "PARA"),
                ("item_id", "ibuprofen"),
            ]),
            // The id settles the ambiguous name.
            line_row(&[
                ("master_list_name", "Ward list"),
                ("master_list_id", "ward_b"),
                ("item_code", "IBU"),
            ]),
            // The same item on the same list again changes the record the row above added.
            line_row(&[
                ("master_list_id", "ward_b"),
                ("item_code", "IBU"),
                ("price_per_unit", "1"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("master_list_name"),
                "master_list_name \"Nope\" not found"
            ),
            (
                3,
                Some("master_list_name"),
                "ambiguous reference, please provide id instead"
            ),
            (4, Some("item_code"), "item_code \"NOPE\" not found"),
            (
                5,
                Some("master_list_name"),
                "master_list_name and id conflict: Paracetamol (PARA) on Essential medicines has master_list_name Essential medicines and id line_eml_para, but this row has master_list_name Clinic list and id line_eml_para"
            ),
            (
                6,
                Some("item_id"),
                "item_id and id conflict: Paracetamol (PARA) on Essential medicines has item_id paracetamol and id line_eml_para, but this row has item_id ibuprofen and id line_eml_para"
            ),
            (
                7,
                Some("id"),
                "id conflict: Paracetamol (PARA) on Essential medicines has id line_eml_para, but this row has id copied"
            ),
            (
                8,
                Some("item_code"),
                "item_code and item_id conflict: PARA resolves to paracetamol but item_id contains ibuprofen"
            ),
            (10, None, "Row 9 already changes this record"),
        ]
    );
    assert_eq!(summary.tables[0].inserted, 1);
}

// covers: OMS-REG-CDIO-01.180

#[actix_rt::test]
async fn a_master_list_line_row_cannot_touch_the_placeholder_master_list() {
    let (connection, service_provider, dir) = line_setup("central_data_line_protected").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        line_sheet(vec![
            line_row(&[("master_list_id", MISSING_PROGRAM), ("item_code", "PARA")]),
            line_row(&[("id", "line_missing"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let message =
        "missing_program is protected, as the server needs it, so import can't change its items";
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("master_list_id"), message),
            (3, Some("master_list_id"), message),
        ]
    );
    assert_eq!(lines_of(&connection, MISSING_PROGRAM).len(), 1);
}

// covers: OMS-REG-CDIO-01.181

#[actix_rt::test]
async fn a_master_list_line_delete_row_with_a_missing_reference_applies_nothing() {
    let (connection, service_provider, dir) = line_setup("central_data_line_delete_missing").await;
    let ctx = service_provider.basic_context().unwrap();
    let before = lines_of(&connection, "eml");

    let path = write_file(
        dir.path(),
        line_sheet(vec![
            line_row(&[
                ("master_list_name", "Essential medicines"),
                ("item_code", "PARA"),
                ("delete", "DELETE"),
            ]),
            line_row(&[
                ("master_list_name", "Essential medicines"),
                ("item_code", "NOPE"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(3, Some("item_code"), "item_code \"NOPE\" not found")]
    );
    assert_eq!(lines_of(&connection, "eml"), before);
}

// covers: OMS-REG-CDIO-01.182

#[actix_rt::test]
async fn a_master_list_line_finds_a_master_list_and_item_earlier_sheets_add() {
    let (connection, service_provider, dir) = line_setup("central_data_line_earlier_sheets").await;
    let ctx = service_provider.basic_context().unwrap();

    // Sheets run in table order, not file order.
    let path = write_file(
        dir.path(),
        sheet::write(vec![
            line_sheet_data(vec![line_row(&[
                ("master_list_name", "Hospital list"),
                ("item_code", "AMOX"),
                ("price_per_unit", "0.5"),
            ])]),
            sheet_data(
                "master_list",
                &MASTER_LIST_HEADERS,
                vec![master_list_row([
                    "hospital",
                    "",
                    "Hospital list",
                    "",
                    "TRUE",
                    "FALSE",
                    "",
                ])],
            ),
            sheet_data("item", &ITEM_HEADERS, vec![new_item("AMOX", "Tab", "", "")]),
        ])
        .unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let amoxicillin = find_item(&connection, "AMOX");
    let lines = lines_of(&connection, "hospital");
    assert_eq!(lines.len(), 1);
    assert_eq!((&lines[0].1, lines[0].2), (&amoxicillin.id, Some(0.5)));
}

// Names on master lists

const NAME_JOIN_HEADERS: [&str; 7] = [
    "id",
    "master_list_name",
    "master_list_id",
    "name_code",
    "name_type",
    "name_id",
    "delete",
];

fn name_join_sheet_data(rows: Vec<Vec<Value>>) -> SheetData {
    sheet_data("master_list_name_join", &NAME_JOIN_HEADERS, rows)
}

fn name_join_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![name_join_sheet_data(rows)]).unwrap()
}

/// A row of `NAME_JOIN_HEADERS` with the given cells; the others are blank.
fn name_join_row(cells: &[(&str, &str)]) -> Vec<Value> {
    NAME_JOIN_HEADERS
        .iter()
        .map(
            |header| match cells.iter().find(|(column, _)| column == header) {
                Some((_, cell)) if !cell.is_empty() => Value::Text(cell.to_string()),
                _ => Value::Empty,
            },
        )
        .collect()
}

fn add_name_join(connection: &StorageConnection, id: &str, master_list_id: &str, name_id: &str) {
    MasterListNameJoinRepository::new(connection)
        .upsert_one(&MasterListNameJoinRow {
            id: id.to_string(),
            master_list_id: master_list_id.to_string(),
            name_id: name_id.to_string(),
        })
        .unwrap();
}

/// Each of the master list's joins, as (id, name id), in id order.
fn name_joins_of(connection: &StorageConnection, master_list_id: &str) -> Vec<(String, String)> {
    MasterListNameJoinRepository::new(connection)
        .query_by_filter(MasterListNameJoinFilter {
            master_list_id: Some(EqualFilter::equal_to(master_list_id.to_string())),
            ..Default::default()
        })
        .unwrap()
        .into_iter()
        .map(|(join, _)| (join.id, join.name_id))
        .collect()
}

fn name_joins_containing(contains: Option<&str>) -> ExportTable {
    ExportTable {
        table: CentralDataTable::MasterListNameJoin,
        filter: ExportFilter {
            contains: contains.map(str::to_string),
            ..Default::default()
        },
    }
}

/// `name_setup`, with the master lists Essential medicines and Clinic list. Essential medicines is
/// given to the clinic, the main store's name, the deleted clinic, the patient and the system name
/// `invad`; Clinic list to the clinic; the placeholder master list to the clinic.
async fn name_join_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (connection, service_provider, dir) = name_setup(name).await;
    let master_lists = MasterListRowRepository::new(&connection);
    master_lists.upsert_one(&essential_medicines()).unwrap();
    master_lists
        .upsert_one(&MasterListRow {
            id: "clinic_list".to_string(),
            name: "Clinic list".to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap();
    for (id, master_list_id, name_id) in [
        ("mlnj_eml_clinic", "eml", "clinic"),
        ("mlnj_eml_main", "eml", "main_store_name"),
        ("mlnj_eml_closed", "eml", "closed"),
        ("mlnj_eml_patient", "eml", "patient"),
        ("mlnj_eml_invad", "eml", "invad"),
        ("mlnj_clinic_list_clinic", "clinic_list", "clinic"),
        ("mlnj_missing", MISSING_PROGRAM, "clinic"),
    ] {
        add_name_join(&connection, id, master_list_id, name_id);
    }
    (connection, service_provider, dir)
}

// covers: OMS-REG-CDIO-01.10, .11, .185, .189

#[actix_rt::test]
async fn master_list_name_joins_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) =
        name_join_setup("central_data_name_join_round_trip").await;
    let ctx = service_provider.basic_context().unwrap();
    let before = (
        name_joins_of(&connection, "eml"),
        name_joins_of(&connection, "clinic_list"),
    );

    let bytes = CentralDataService
        .export(&ctx, &[name_joins_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let Ok(sheets) = sheet::read(&path, MAX_IMPORT_ROWS) else {
        panic!("the export reads back")
    };
    let sheet = &sheets[0];
    assert_eq!(
        sheet.headers,
        [NAME_JOIN_HEADERS.as_slice(), &["name_name"]].concat()
    );
    // By master list name in any letter case, then name code. Not the placeholder master list's,
    // the patient's or the system name's; the deleted name's is.
    let rows: Vec<&[String]> = sheet.rows.iter().map(|row| row.cells.as_slice()).collect();
    assert_eq!(
        rows,
        [
            [
                "mlnj_clinic_list_clinic",
                "Clinic list",
                "clinic_list",
                "CL1",
                "FACILITY",
                "clinic",
                "",
                "Central clinic"
            ],
            [
                "mlnj_eml_clinic",
                "Essential medicines",
                "eml",
                "CL1",
                "FACILITY",
                "clinic",
                "",
                "Central clinic"
            ],
            [
                "mlnj_eml_closed",
                "Essential medicines",
                "eml",
                "CL2",
                "FACILITY",
                "closed",
                "",
                "Closed clinic"
            ],
            [
                "mlnj_eml_main",
                "Essential medicines",
                "eml",
                "MAIN",
                "STORE",
                "main_store_name",
                "",
                "Main store"
            ],
        ]
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 4);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        (
            name_joins_of(&connection, "eml"),
            name_joins_of(&connection, "clinic_list")
        ),
        before
    );
}

// covers: OMS-REG-CDIO-01.46, .186

#[actix_rt::test]
async fn a_master_list_name_join_export_searches_master_list_name_and_name_code() {
    let (_, service_provider, _) = name_join_setup("central_data_name_join_filter").await;
    let ctx = service_provider.basic_context().unwrap();
    let count = |contains: Option<&str>| {
        CentralDataService
            .export_counts(&ctx, &[name_joins_containing(contains)])
            .unwrap()[0]
            .count
    };

    assert_eq!(
        count(None),
        RecordCount {
            matching: 4,
            total: 4
        }
    );
    assert_eq!(count(Some(" essential ")).matching, 3);
    assert_eq!(count(Some("clinic")).matching, 1);
    // Not the placeholder master list's join, whose name has the code too: the search's two
    // sides are grouped, so the placeholder is left out whichever side matches.
    assert_eq!(count(Some("cl1")).matching, 2);
    // Not the patient's, nor the name's name, nor the master list's code.
    assert_eq!(count(Some("P001")).matching, 0);
    assert_eq!(count(Some("central")).matching, 0);
    assert_eq!(count(Some("EML")).matching, 0);
}

// covers: OMS-REG-CDIO-01.12, .25, .26, .36, .55, .187

#[actix_rt::test]
async fn master_list_name_join_rows_add_and_delete_by_master_list_and_name() {
    let (connection, service_provider, dir) =
        name_join_setup("central_data_name_join_upsert").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        name_join_sheet(vec![
            name_join_row(&[("master_list_name", "Clinic list")]),
            name_join_row(&[("name_code", "MAIN")]),
            name_join_row(&[
                ("master_list_name", "Clinic list"),
                ("name_code", "CL1"),
                ("delete", "Delete"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("name_code"),
                "name_code is required for a new name on a master list"
            ),
            (
                3,
                Some("master_list_name"),
                "master_list_name is required for a new name on a master list"
            ),
            (
                4,
                Some("delete"),
                "\"Delete\" is not valid. Type DELETE to delete this row, or leave it blank"
            ),
        ]
    );

    let path = write_file(
        dir.path(),
        name_join_sheet(vec![
            // A new join.
            name_join_row(&[("master_list_name", "Clinic list"), ("name_code", "MAIN")]),
            // No id: found by its master list and name.
            name_join_row(&[
                ("master_list_name", "Essential medicines"),
                ("name_code", "CL1"),
                ("name_type", "FACILITY"),
            ]),
            name_join_row(&[
                ("id", "mlnj_clinic_list_clinic"),
                ("master_list_name", "Clinic list"),
                ("name_code", "CL1"),
                ("name_type", "facility"),
                ("delete", "DELETE"),
            ]),
            // Already gone: unchanged.
            name_join_row(&[("id", "gone"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        summary.tables,
        vec![TableChanges {
            table: CentralDataTable::MasterListNameJoin,
            inserted: 1,
            updated: 0,
            deleted: 1,
            unchanged: 2,
            error_count: 0,
        }]
    );
    assert_eq!(
        summary
            .changes
            .iter()
            .map(|change| (change.record.as_str(), change.change))
            .collect::<Vec<_>>(),
        [
            ("Main store (MAIN) on Clinic list", Change::Inserted),
            ("Central clinic (CL1) on Clinic list", Change::Deleted),
        ]
    );
    let clinic_list = name_joins_of(&connection, "clinic_list");
    assert_eq!(clinic_list.len(), 1);
    assert_eq!(clinic_list[0].1, "main_store_name");
}

// covers: OMS-REG-CDIO-01.24, .39, .188, .190

#[actix_rt::test]
async fn a_master_list_name_join_finds_its_references_and_cannot_change_them() {
    let (connection, service_provider, dir) =
        name_join_setup("central_data_name_join_references").await;
    let ctx = service_provider.basic_context().unwrap();
    // An inactive list with an active one's name doesn't make the name ambiguous; two active
    // ones sharing a name, as legacy mSupply can send them, do.
    let master_lists = MasterListRowRepository::new(&connection);
    master_lists
        .upsert_one(&MasterListRow {
            id: "old_clinic_list".to_string(),
            name: "Clinic list".to_string(),
            is_active: false,
            ..Default::default()
        })
        .unwrap();
    for id in ["ward_a", "ward_b"] {
        master_lists
            .upsert_one(&MasterListRow {
                id: id.to_string(),
                name: "Ward list".to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();
    }
    // CL1 is a store's code too, so a code with no type is ambiguous.
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "cl1_store".to_string(),
            code: "CL1".to_string(),
            name: "Clinic store".to_string(),
            r#type: NameRowType::Store,
            ..Default::default()
        })
        .unwrap();

    let path = write_file(
        dir.path(),
        name_join_sheet(vec![
            name_join_row(&[("master_list_name", "Nope"), ("name_code", "MAIN")]),
            name_join_row(&[("master_list_name", "Ward list"), ("name_code", "MAIN")]),
            name_join_row(&[("master_list_id", "clinic_list"), ("name_code", "CL1")]),
            name_join_row(&[("master_list_name", "Clinic list"), ("name_id", "patient")]),
            name_join_row(&[("master_list_name", "Clinic list"), ("name_id", "invad")]),
            // A code alone never finds a system name.
            name_join_row(&[("master_list_name", "Clinic list"), ("name_code", "invad")]),
            name_join_row(&[
                ("master_list_name", "Clinic list"),
                ("name_id", "cl1_store"),
                ("name_type", "FACILITY"),
            ]),
            name_join_row(&[
                ("id", "mlnj_eml_clinic"),
                ("master_list_name", "Clinic list"),
                ("name_code", "CL1"),
                ("name_type", "FACILITY"),
            ]),
            name_join_row(&[("id", "mlnj_eml_clinic"), ("name_id", "main_store_name")]),
            name_join_row(&[
                ("id", "copied"),
                ("master_list_name", "Essential medicines"),
                ("name_code", "MAIN"),
            ]),
            // The ids settle the ambiguous master list name and name code.
            name_join_row(&[
                ("master_list_name", "Ward list"),
                ("master_list_id", "ward_b"),
                ("name_code", "CL1"),
                ("name_id", "clinic"),
            ]),
            // Repeating it changes nothing.
            name_join_row(&[("master_list_id", "ward_b"), ("name_id", "clinic")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("master_list_name"),
                "master_list_name \"Nope\" not found"
            ),
            (
                3,
                Some("master_list_name"),
                "ambiguous reference, please provide id instead"
            ),
            (
                4,
                Some("name_code"),
                "ambiguous reference, please provide id instead"
            ),
            (
                5,
                Some("name_id"),
                "Moreau, Anna (P001) is a patient, so import doesn't change which master lists are given to a patient"
            ),
            (
                6,
                Some("name_id"),
                "Inventory adjustments (invad) is a system name, as the server needs it, so import can't change which master lists are given to it"
            ),
            (7, Some("name_code"), "name_code \"invad\" not found"),
            (
                8,
                Some("name_type"),
                "Clinic store (CL1) is of type STORE, not FACILITY"
            ),
            (
                9,
                Some("master_list_name"),
                "master_list_name and id conflict: Central clinic (CL1) on Essential medicines has master_list_name Essential medicines and id mlnj_eml_clinic, but this row has master_list_name Clinic list and id mlnj_eml_clinic"
            ),
            (
                10,
                Some("name_id"),
                "name_id and id conflict: Central clinic (CL1) on Essential medicines has name_id clinic and id mlnj_eml_clinic, but this row has name_id main_store_name and id mlnj_eml_clinic"
            ),
            (
                11,
                Some("id"),
                "id conflict: Main store (MAIN) on Essential medicines has id mlnj_eml_main, but this row has id copied"
            ),
        ]
    );
    assert_eq!(
        (summary.tables[0].inserted, summary.tables[0].unchanged),
        (1, 1)
    );
}

// covers: OMS-REG-CDIO-01.189

#[actix_rt::test]
async fn a_master_list_cannot_be_given_to_a_deleted_name_or_twice() {
    let (connection, service_provider, dir) =
        name_join_setup("central_data_name_join_deleted_name").await;
    let ctx = service_provider.basic_context().unwrap();
    // The deleted clinic's join is saved, so a new one is the service's check.
    MasterListNameJoinRepository::new(&connection)
        .delete("mlnj_eml_closed")
        .unwrap();

    let path = write_file(
        dir.path(),
        name_join_sheet(vec![
            name_join_row(&[
                ("master_list_name", "Essential medicines"),
                ("name_code", "CL2"),
                ("name_type", "FACILITY"),
            ]),
            name_join_row(&[
                ("id", "first"),
                ("master_list_name", "Clinic list"),
                ("name_code", "MAIN"),
            ]),
            // Another id for the record the row above adds.
            name_join_row(&[
                ("id", "second"),
                ("master_list_name", "Clinic list"),
                ("name_code", "MAIN"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("name_code"),
                "Closed clinic (CL2) is deleted, so it can't be given a master list"
            ),
            (
                4,
                Some("id"),
                "id conflict: Main store (MAIN) on Clinic list has id first, but this row has id second"
            ),
        ]
    );
    assert_eq!(summary.tables[0].inserted, 1);
}

// covers: OMS-REG-CDIO-01.190

#[actix_rt::test]
async fn a_master_list_name_join_row_cannot_touch_the_placeholder_master_list() {
    let (connection, service_provider, dir) =
        name_join_setup("central_data_name_join_protected").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        name_join_sheet(vec![
            name_join_row(&[("master_list_id", MISSING_PROGRAM), ("name_code", "MAIN")]),
            name_join_row(&[("id", "mlnj_missing"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let message = "missing_program is protected, as the server needs it, so import can't change which names it's given to";
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("master_list_id"), message),
            (3, Some("master_list_id"), message),
        ]
    );
    assert_eq!(name_joins_of(&connection, MISSING_PROGRAM).len(), 1);
}

// covers: OMS-REG-CDIO-01.191

#[actix_rt::test]
async fn a_master_list_name_join_delete_row_with_a_missing_reference_applies_nothing() {
    let (connection, service_provider, dir) =
        name_join_setup("central_data_name_join_delete_missing").await;
    let ctx = service_provider.basic_context().unwrap();
    let before = name_joins_of(&connection, "eml");

    let path = write_file(
        dir.path(),
        name_join_sheet(vec![
            name_join_row(&[
                ("master_list_name", "Essential medicines"),
                ("name_code", "MAIN"),
                ("delete", "DELETE"),
            ]),
            name_join_row(&[
                ("master_list_name", "Essential medicines"),
                ("name_code", "NOPE"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(3, Some("name_code"), "name_code \"NOPE\" not found")]
    );
    assert_eq!(name_joins_of(&connection, "eml"), before);
}

// covers: OMS-REG-CDIO-01.192

#[actix_rt::test]
async fn a_master_list_name_join_finds_a_master_list_and_name_earlier_sheets_add() {
    let (connection, service_provider, dir) =
        name_join_setup("central_data_name_join_earlier_sheets").await;
    let ctx = service_provider.basic_context().unwrap();

    // Sheets run in table order, not file order.
    let path = write_file(
        dir.path(),
        sheet::write(vec![
            name_join_sheet_data(vec![name_join_row(&[
                ("master_list_name", "Hospital list"),
                ("name_code", "WARD"),
                ("name_type", "FACILITY"),
            ])]),
            sheet_data(
                "master_list",
                &MASTER_LIST_HEADERS,
                vec![master_list_row([
                    "hospital",
                    "",
                    "Hospital list",
                    "",
                    "TRUE",
                    "FALSE",
                    "",
                ])],
            ),
            sheet_data(
                "name",
                &NAME_HEADERS,
                vec![new_name_row(&[
                    ("id", "ward"),
                    ("code", "WARD"),
                    ("type", "FACILITY"),
                    ("name", "Ward"),
                ])],
            ),
        ])
        .unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let joins = name_joins_of(&connection, "hospital");
    assert_eq!(joins.len(), 1);
    assert_eq!(joins[0].1, "ward");
}

// covers: OMS-REG-CDIO-01.193

#[actix_rt::test]
async fn two_saved_joins_for_one_master_list_and_name_are_found_by_id() {
    let (connection, service_provider, dir) =
        name_join_setup("central_data_name_join_shared_pair").await;
    let ctx = service_provider.basic_context().unwrap();
    // A join for another name, merged into the clinic since: both joins now give it the list.
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "old_clinic".to_string(),
            code: "CL1-OLD".to_string(),
            name: "Central clinic (old)".to_string(),
            r#type: NameRowType::Facility,
            ..Default::default()
        })
        .unwrap();
    add_name_join(&connection, "mlnj_eml_old_clinic", "eml", "old_clinic");
    NameLinkRowRepository::new(&connection)
        .upsert_one(&NameLinkRow {
            id: "old_clinic".to_string(),
            name_id: "clinic".to_string(),
        })
        .unwrap();
    let shared = |id: &str| (id.to_string(), "clinic".to_string());
    assert!(name_joins_of(&connection, "eml").contains(&shared("mlnj_eml_old_clinic")));

    // An export writes both, and imports unchanged.
    let bytes = CentralDataService
        .export(&ctx, &[name_joins_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 5);

    let path = write_file(
        dir.path(),
        name_join_sheet(vec![
            // Without an id, the pair finds both.
            name_join_row(&[
                ("master_list_name", "Essential medicines"),
                ("name_code", "CL1"),
                ("name_type", "FACILITY"),
                ("delete", "DELETE"),
            ]),
            // With one, it settles which.
            name_join_row(&[("id", "mlnj_eml_old_clinic"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("id"),
            "ambiguous reference, please provide id instead"
        )]
    );

    let path = write_file(
        dir.path(),
        name_join_sheet(vec![name_join_row(&[
            ("id", "mlnj_eml_old_clinic"),
            ("delete", "DELETE"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 1);
    let eml = name_joins_of(&connection, "eml");
    assert!(eml.contains(&shared("mlnj_eml_clinic")));
    assert!(!eml.contains(&shared("mlnj_eml_old_clinic")));
}

// covers: OMS-REG-CDIO-01.190

#[actix_rt::test]
async fn a_master_list_name_join_row_with_only_an_id_cannot_touch_a_patients_or_system_names_record()
 {
    let (connection, service_provider, dir) =
        name_join_setup("central_data_name_join_id_only_patient").await;
    let ctx = service_provider.basic_context().unwrap();
    let before = name_joins_of(&connection, "eml");

    let path = write_file(
        dir.path(),
        name_join_sheet(vec![
            name_join_row(&[("id", "mlnj_eml_patient"), ("delete", "DELETE")]),
            name_join_row(&[("id", "mlnj_eml_invad"), ("delete", "DELETE")]),
            name_join_row(&[("id", "mlnj_eml_patient")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    let patient = "Moreau, Anna (P001) is a patient, so import doesn't change which master lists are given to a patient";
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("name_id"), patient),
            (
                3,
                Some("name_id"),
                "Inventory adjustments (invad) is a system name, as the server needs it, so import can't change which master lists are given to it"
            ),
            (4, Some("name_id"), patient),
        ]
    );
    assert_eq!(name_joins_of(&connection, "eml"), before);
}

// Items in stores

const ITEM_STORE_HEADERS: [&str; 11] = [
    "id",
    "item_code",
    "item_id",
    "store_code",
    "store_id",
    "default_sell_price_per_pack",
    "ignore_for_orders",
    "margin",
    "default_location_code",
    "default_location_id",
    "delete",
];

fn item_store_sheet_data(rows: Vec<Vec<Value>>) -> SheetData {
    sheet_data("item_store_join", &ITEM_STORE_HEADERS, rows)
}

fn item_store_sheet(rows: Vec<Vec<Value>>) -> Vec<u8> {
    sheet::write(vec![item_store_sheet_data(rows)]).unwrap()
}

/// A row of `ITEM_STORE_HEADERS` with the given cells; the others are blank.
fn item_store_row(cells: &[(&str, &str)]) -> Vec<Value> {
    ITEM_STORE_HEADERS
        .iter()
        .map(
            |header| match cells.iter().find(|(column, _)| column == header) {
                Some((_, cell)) if !cell.is_empty() => Value::Text(cell.to_string()),
                _ => Value::Empty,
            },
        )
        .collect()
}

/// A row with the given cells, and a price of 1, orders not ignoring it and a margin of 0 unless
/// they say otherwise.
fn new_item_store_row(cells: &[(&'static str, &'static str)]) -> Vec<Value> {
    let defaults = [
        ("default_sell_price_per_pack", "1"),
        ("ignore_for_orders", "FALSE"),
        ("margin", "0"),
    ];
    let defaults: Vec<_> = defaults
        .into_iter()
        .filter(|(column, _)| !cells.iter().any(|(given, _)| given == column))
        .collect();
    item_store_row(&[cells, &defaults].concat())
}

fn add_item_store_join(connection: &StorageConnection, row: ItemStoreJoinRow) {
    ItemStoreJoinRowRepository::new(connection)
        .upsert_one(&row)
        .unwrap();
}

/// Each of the store's joins, in id order.
fn item_store_joins_of(connection: &StorageConnection, store_id: &str) -> Vec<ItemStoreJoinRow> {
    ItemStoreJoinRowRepository::new(connection)
        .query_with_names(ItemStoreJoinFilter::default())
        .unwrap()
        .into_iter()
        .map(|join| join.item_store_join)
        .filter(|join| join.store_id == store_id)
        .collect()
}

fn item_stores_containing(contains: Option<&str>) -> ExportTable {
    ExportTable {
        table: CentralDataTable::ItemStoreJoin,
        filter: ExportFilter {
            contains: contains.map(str::to_string),
            ..Default::default()
        },
    }
}

/// `store_setup`, with the store Ward 1, coded W1; the items Paracetamol and Ibuprofen; the
/// locations SHELF and FRIDGE in Main store and SHELF in Ward 1; Paracetamol in both stores, each
/// on its store's shelf; and Ibuprofen in Main store, which orders ignore.
async fn item_store_setup(name: &str) -> (StorageConnection, ServiceProvider, TempDir) {
    let (connection, service_provider, dir) = store_setup(name).await;
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "ward_1_name".to_string(),
            code: "WARD1".to_string(),
            name: "Ward 1".to_string(),
            r#type: NameRowType::Store,
            ..Default::default()
        })
        .unwrap();
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "store_ward".to_string(),
            name_id: "ward_1_name".to_string(),
            code: "W1".to_string(),
            ..Default::default()
        })
        .unwrap();
    for (id, code, name) in [
        ("paracetamol", "PARA", "Paracetamol"),
        ("ibuprofen", "IBU", "Ibuprofen"),
    ] {
        ItemRowRepository::new(&connection)
            .upsert_one(&ItemRow {
                id: id.to_string(),
                code: code.to_string(),
                name: name.to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();
    }
    for (id, code, name, store_id) in [
        ("shelf_main", "SHELF", "Main shelf", "store_main"),
        ("fridge_main", "FRIDGE", "Main fridge", "store_main"),
        ("shelf_ward", "SHELF", "Ward shelf", "store_ward"),
    ] {
        LocationRowRepository::new(&connection)
            .upsert_one(&LocationRow {
                id: id.to_string(),
                code: code.to_string(),
                name: name.to_string(),
                store_id: store_id.to_string(),
                ..Default::default()
            })
            .unwrap();
    }
    for row in [
        ItemStoreJoinRow {
            id: "isj_main_para".to_string(),
            item_id: "paracetamol".to_string(),
            store_id: "store_main".to_string(),
            default_sell_price_per_pack: 2.5,
            ignore_for_orders: false,
            margin: 10.0,
            default_location_id: Some("shelf_main".to_string()),
        },
        ItemStoreJoinRow {
            id: "isj_main_ibu".to_string(),
            item_id: "ibuprofen".to_string(),
            store_id: "store_main".to_string(),
            default_sell_price_per_pack: 0.0,
            ignore_for_orders: true,
            margin: 0.0,
            default_location_id: None,
        },
        ItemStoreJoinRow {
            id: "isj_ward_para".to_string(),
            item_id: "paracetamol".to_string(),
            store_id: "store_ward".to_string(),
            default_sell_price_per_pack: 3.0,
            ignore_for_orders: false,
            margin: 0.0,
            default_location_id: Some("shelf_ward".to_string()),
        },
    ] {
        add_item_store_join(&connection, row);
    }
    (connection, service_provider, dir)
}

// covers: OMS-REG-CDIO-01.10, .11, .194

#[actix_rt::test]
async fn item_store_joins_export_then_import_makes_no_changes() {
    let (connection, service_provider, dir) =
        item_store_setup("central_data_item_store_round_trip").await;
    let ctx = service_provider.basic_context().unwrap();
    let before = (
        item_store_joins_of(&connection, "store_main"),
        item_store_joins_of(&connection, "store_ward"),
    );

    let bytes = CentralDataService
        .export(&ctx, &[item_stores_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let Ok(sheets) = sheet::read(&path, MAX_IMPORT_ROWS) else {
        panic!("the export reads back")
    };
    let sheet = &sheets[0];
    assert_eq!(
        sheet.headers,
        [
            ITEM_STORE_HEADERS.as_slice(),
            &["item_name", "store_name", "default_location_name"]
        ]
        .concat()
    );
    // By store code, then item code.
    let rows: Vec<&[String]> = sheet.rows.iter().map(|row| row.cells.as_slice()).collect();
    assert_eq!(
        rows,
        [
            [
                "isj_main_ibu",
                "IBU",
                "ibuprofen",
                "MS",
                "store_main",
                "0",
                "true",
                "0",
                "",
                "",
                "",
                "Ibuprofen",
                "Main store",
                ""
            ],
            [
                "isj_main_para",
                "PARA",
                "paracetamol",
                "MS",
                "store_main",
                "2.5",
                "false",
                "10",
                "SHELF",
                "shelf_main",
                "",
                "Paracetamol",
                "Main store",
                "Main shelf"
            ],
            [
                "isj_ward_para",
                "PARA",
                "paracetamol",
                "W1",
                "store_ward",
                "3",
                "false",
                "0",
                "SHELF",
                "shelf_ward",
                "",
                "Paracetamol",
                "Ward 1",
                "Ward shelf"
            ],
        ]
    );

    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 3);
    assert_eq!(summary.changes, vec![]);
    assert_eq!(
        (
            item_store_joins_of(&connection, "store_main"),
            item_store_joins_of(&connection, "store_ward"),
        ),
        before
    );
}

// covers: OMS-REG-CDIO-01.46, .195

#[actix_rt::test]
async fn an_item_store_join_export_searches_item_code_and_store_code() {
    let (_, service_provider, _) = item_store_setup("central_data_item_store_filter").await;
    let ctx = service_provider.basic_context().unwrap();
    let count = |contains: Option<&str>| {
        CentralDataService
            .export_counts(&ctx, &[item_stores_containing(contains)])
            .unwrap()[0]
            .count
    };

    assert_eq!(
        count(None),
        RecordCount {
            matching: 3,
            total: 3
        }
    );
    assert_eq!(count(Some(" para ")).matching, 2);
    assert_eq!(count(Some("ms")).matching, 2);
    assert_eq!(count(Some("w1")).matching, 1);
    // Not the item's name, nor the store's name.
    assert_eq!(count(Some("ibuprofen")).matching, 0);
    assert_eq!(count(Some("ward")).matching, 0);
}

// covers: OMS-REG-CDIO-01.12, .25, .26, .36, .55, .63, .196

#[actix_rt::test]
async fn item_store_join_rows_add_update_and_delete_by_item_and_store() {
    let (connection, service_provider, dir) =
        item_store_setup("central_data_item_store_upsert").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            new_item_store_row(&[("store_code", "W1")]),
            item_store_row(&[("item_code", "IBU"), ("store_code", "W1")]),
            item_store_row(&[
                ("item_code", "PARA"),
                ("store_code", "MS"),
                ("delete", "Delete"),
            ]),
            item_store_row(&[
                ("item_code", "IBU"),
                ("store_code", "MS"),
                ("margin", "lots"),
                ("ignore_for_orders", "maybe"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("item_code"),
                "item_code is required for a new item in a store"
            ),
            (
                3,
                Some("default_sell_price_per_pack"),
                "default_sell_price_per_pack is required for a new item in a store"
            ),
            (
                3,
                Some("ignore_for_orders"),
                "ignore_for_orders is required for a new item in a store"
            ),
            (
                3,
                Some("margin"),
                "margin is required for a new item in a store"
            ),
            (
                4,
                Some("delete"),
                "\"Delete\" is not valid. Type DELETE to delete this row, or leave it blank"
            ),
            (
                5,
                Some("ignore_for_orders"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            ),
            (5, Some("margin"), "\"lots\" must be a number"),
        ]
    );

    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            // A new join, on the store's fridge.
            new_item_store_row(&[
                ("item_code", "IBU"),
                ("store_code", "W1"),
                ("default_sell_price_per_pack", "4.5"),
                ("ignore_for_orders", "TRUE"),
                ("margin", "20"),
            ]),
            // No id: found by its item and store. Blank required cells keep the saved values.
            item_store_row(&[
                ("item_code", "PARA"),
                ("store_code", "MS"),
                ("default_sell_price_per_pack", "2.75"),
                ("default_location_code", "FRIDGE"),
            ]),
            item_store_row(&[
                ("id", "isj_main_ibu"),
                ("item_code", "IBU"),
                ("store_code", "MS"),
                ("ignore_for_orders", "TRUE"),
                ("delete", "DELETE"),
            ]),
            // Already gone: unchanged.
            item_store_row(&[("id", "gone"), ("delete", "DELETE")]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(
        summary.tables,
        vec![TableChanges {
            table: CentralDataTable::ItemStoreJoin,
            inserted: 1,
            updated: 1,
            deleted: 1,
            unchanged: 1,
            error_count: 0,
        }]
    );
    assert_eq!(
        summary
            .changes
            .iter()
            .map(|change| (change.record.as_str(), change.change))
            .collect::<Vec<_>>(),
        [
            ("Ibuprofen (IBU) in store W1", Change::Inserted),
            ("Paracetamol (PARA) in store MS", Change::Updated),
            ("Ibuprofen (IBU) in store MS", Change::Deleted),
        ]
    );
    assert_eq!(
        summary.changes[1].fields,
        vec![
            FieldChange {
                column: "default_sell_price_per_pack",
                from: "2.5".to_string(),
                to: "2.75".to_string(),
            },
            FieldChange {
                column: "default_location_code",
                from: "SHELF".to_string(),
                to: "FRIDGE".to_string(),
            },
            FieldChange {
                column: "default_location_id",
                from: "shelf_main".to_string(),
                to: "fridge_main".to_string(),
            },
        ]
    );
    let ward = item_store_joins_of(&connection, "store_ward");
    let added = ward
        .iter()
        .find(|join| join.item_id == "ibuprofen")
        .unwrap();
    assert_eq!(
        (
            added.default_sell_price_per_pack,
            added.ignore_for_orders,
            added.margin,
            added.default_location_id.as_deref()
        ),
        (4.5, true, 20.0, None)
    );
    assert_eq!(
        item_store_joins_of(&connection, "store_main"),
        [ItemStoreJoinRow {
            id: "isj_main_para".to_string(),
            item_id: "paracetamol".to_string(),
            store_id: "store_main".to_string(),
            default_sell_price_per_pack: 2.75,
            ignore_for_orders: false,
            margin: 10.0,
            default_location_id: Some("fridge_main".to_string()),
        }]
    );

    // Both location cells blank clear it; a DELETE row may keep the saved values, but not change
    // them.
    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            item_store_row(&[("id", "isj_main_para")]),
            item_store_row(&[
                ("id", "isj_ward_para"),
                ("margin", "5"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            3,
            Some("delete"),
            "A row marked DELETE can't also change margin. Clear it or put back the saved value"
        )]
    );
    assert_eq!(
        summary.changes[0].fields,
        vec![
            FieldChange {
                column: "default_location_code",
                from: "FRIDGE".to_string(),
                to: "".to_string(),
            },
            FieldChange {
                column: "default_location_id",
                from: "fridge_main".to_string(),
                to: "".to_string(),
            },
        ]
    );

    // A sheet without the location columns keeps the saved location.
    let path = write_file(
        dir.path(),
        sheet::write(vec![sheet_data(
            "item_store_join",
            &["id", "margin"],
            vec![vec![
                Value::Text("isj_ward_para".to_string()),
                Value::Text("7".to_string()),
            ]],
        )])
        .unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let ward_para = ItemStoreJoinRowRepository::new(&connection)
        .find_one_by_id("isj_ward_para")
        .unwrap()
        .unwrap();
    assert_eq!(
        (ward_para.margin, ward_para.default_location_id.as_deref()),
        (7.0, Some("shelf_ward"))
    );
}

// covers: OMS-REG-CDIO-01.23, .24, .39, .197

#[actix_rt::test]
async fn an_item_store_join_finds_its_references_and_cannot_change_them() {
    let (_, service_provider, dir) = item_store_setup("central_data_item_store_references").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            new_item_store_row(&[("item_code", "NOPE"), ("store_code", "W1")]),
            new_item_store_row(&[("item_code", "IBU"), ("store_code", "NOPE")]),
            new_item_store_row(&[("item_id", "nope"), ("store_code", "W1")]),
            item_store_row(&[("id", "isj_main_para"), ("store_code", "W1")]),
            item_store_row(&[("id", "isj_main_para"), ("item_id", "ibuprofen")]),
            item_store_row(&[
                ("id", "copied"),
                ("item_code", "PARA"),
                ("store_code", "MS"),
            ]),
            new_item_store_row(&[
                ("item_code", "PARA"),
                ("item_id", "ibuprofen"),
                ("store_code", "W1"),
            ]),
            // By id alone.
            new_item_store_row(&[("item_id", "ibuprofen"), ("store_id", "store_ward")]),
            // The same item in the same store again changes the record the row above added.
            item_store_row(&[("item_code", "IBU"), ("store_code", "W1"), ("margin", "1")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("item_code"), "item_code \"NOPE\" not found"),
            (3, Some("store_code"), "store_code \"NOPE\" not found"),
            (4, Some("item_id"), "item_id \"nope\" not found"),
            (
                5,
                Some("store_code"),
                "store_code and id conflict: Paracetamol (PARA) in store MS has store_code MS and id isj_main_para, but this row has store_code W1 and id isj_main_para"
            ),
            (
                6,
                Some("item_id"),
                "item_id and id conflict: Paracetamol (PARA) in store MS has item_id paracetamol and id isj_main_para, but this row has item_id ibuprofen and id isj_main_para"
            ),
            (
                7,
                Some("id"),
                "id conflict: Paracetamol (PARA) in store MS has id isj_main_para, but this row has id copied"
            ),
            (
                8,
                Some("item_code"),
                "item_code and item_id conflict: PARA resolves to paracetamol but item_id contains ibuprofen"
            ),
            (10, None, "Row 9 already changes this record"),
        ]
    );
    assert_eq!(summary.tables[0].inserted, 1);
}

// covers: OMS-REG-CDIO-01.198

#[actix_rt::test]
async fn an_item_store_join_finds_its_default_location_among_its_stores() {
    let (connection, service_provider, dir) =
        item_store_setup("central_data_item_store_location").await;
    let ctx = service_provider.basic_context().unwrap();
    NameRowRepository::new(&connection)
        .upsert_one(&NameRow {
            id: "ward_2_name".to_string(),
            code: "WARD2".to_string(),
            name: "Ward 2".to_string(),
            r#type: NameRowType::Store,
            ..Default::default()
        })
        .unwrap();
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "store_ward_2".to_string(),
            name_id: "ward_2_name".to_string(),
            code: "W2".to_string(),
            ..Default::default()
        })
        .unwrap();
    for (id, store_id) in [("cold_main", "store_main"), ("cold_ward_2", "store_ward_2")] {
        LocationRowRepository::new(&connection)
            .upsert_one(&LocationRow {
                id: id.to_string(),
                code: "COLD".to_string(),
                store_id: store_id.to_string(),
                ..Default::default()
            })
            .unwrap();
    }

    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            // SHELF is coded in both stores: each row finds its own store's.
            new_item_store_row(&[
                ("item_code", "IBU"),
                ("store_code", "W1"),
                ("default_location_code", "SHELF"),
            ]),
            item_store_row(&[("id", "isj_main_ibu"), ("default_location_code", "SHELF")]),
            // FRIDGE is only Main store's.
            item_store_row(&[("id", "isj_ward_para"), ("default_location_code", "FRIDGE")]),
            // Another store's location, by id.
            item_store_row(&[
                ("id", "isj_ward_para"),
                ("default_location_id", "fridge_main"),
            ]),
            item_store_row(&[
                ("id", "isj_main_para"),
                ("default_location_code", "SHELF"),
                ("default_location_id", "fridge_main"),
            ]),
            item_store_row(&[("id", "isj_main_para"), ("default_location_id", "nowhere")]),
            item_store_row(&[("id", "isj_ward_para"), ("default_location_code", "COLD")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                4,
                Some("default_location_code"),
                "FRIDGE is a location of store MS, not of store W1"
            ),
            (
                5,
                Some("default_location_id"),
                "FRIDGE is a location of store MS, not of store W1"
            ),
            (
                6,
                Some("default_location_code"),
                "default_location_code and default_location_id conflict: SHELF resolves to shelf_main but default_location_id contains fridge_main"
            ),
            (
                7,
                Some("default_location_id"),
                "default_location_id \"nowhere\" not found"
            ),
            (
                8,
                Some("default_location_code"),
                "COLD is a location of stores MS, W2, not of store W1"
            ),
        ]
    );

    // A DELETE row whose location isn't found stops the whole import.
    let before = item_store_joins_of(&connection, "store_main");
    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            item_store_row(&[("id", "isj_main_ibu"), ("delete", "DELETE")]),
            item_store_row(&[
                ("id", "isj_main_para"),
                ("default_location_code", "ATTIC"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            3,
            Some("default_location_code"),
            "default_location_code \"ATTIC\" not found"
        )]
    );
    assert_eq!(item_store_joins_of(&connection, "store_main"), before);
}

// covers: OMS-REG-CDIO-01.203

#[actix_rt::test]
async fn a_saved_default_location_of_another_store_imports_unchanged_and_can_be_deleted() {
    let (connection, service_provider, dir) =
        item_store_setup("central_data_item_store_other_store_location").await;
    let ctx = service_provider.basic_context().unwrap();
    // As legacy mSupply can send it: Ward 1's join, on Main store's fridge.
    let ward_ibu = ItemStoreJoinRow {
        id: "isj_ward_ibu".to_string(),
        item_id: "ibuprofen".to_string(),
        store_id: "store_ward".to_string(),
        default_sell_price_per_pack: 1.0,
        ignore_for_orders: false,
        margin: 0.0,
        default_location_id: Some("fridge_main".to_string()),
    };
    add_item_store_join(&connection, ward_ibu.clone());
    let find = || {
        ItemStoreJoinRowRepository::new(&connection)
            .find_one_by_id("isj_ward_ibu")
            .unwrap()
    };

    // An unedited export imports unchanged.
    let bytes = CentralDataService
        .export(&ctx, &[item_stores_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 4);

    // A row that keeps the location can change the rest.
    let exported = [
        ("id", "isj_ward_ibu"),
        ("item_code", "IBU"),
        ("store_code", "W1"),
        ("default_location_code", "FRIDGE"),
        ("default_location_id", "fridge_main"),
    ];
    let path = write_file(
        dir.path(),
        item_store_sheet(vec![item_store_row(
            &[exported.as_slice(), &[("margin", "5")]].concat(),
        )]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].updated, 1);
    assert_eq!(
        find(),
        Some(ItemStoreJoinRow {
            margin: 5.0,
            ..ward_ibu
        })
    );

    // A DELETE row as exported deletes it.
    let path = write_file(
        dir.path(),
        item_store_sheet(vec![item_store_row(
            &[exported.as_slice(), &[("delete", "DELETE")]].concat(),
        )]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 1);
    assert_eq!(find(), None);
}

// covers: OMS-REG-CDIO-01.199

#[actix_rt::test]
async fn an_item_store_join_price_cannot_be_negative() {
    let (connection, service_provider, dir) =
        item_store_setup("central_data_item_store_negative_price").await;
    let ctx = service_provider.basic_context().unwrap();
    // A saved negative price, as legacy mSupply could send it.
    add_item_store_join(
        &connection,
        ItemStoreJoinRow {
            id: "isj_ward_ibu".to_string(),
            item_id: "ibuprofen".to_string(),
            store_id: "store_ward".to_string(),
            default_sell_price_per_pack: -1.0,
            ..Default::default()
        },
    );

    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            item_store_row(&[
                ("id", "isj_main_para"),
                ("default_sell_price_per_pack", "-0.5"),
            ]),
            // 0 is a price.
            item_store_row(&[
                ("id", "isj_ward_para"),
                ("default_sell_price_per_pack", "0"),
            ]),
            // A saved negative price stays editable while the row leaves it as it is.
            item_store_row(&[("id", "isj_ward_ibu"), ("margin", "3")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(
            2,
            Some("default_sell_price_per_pack"),
            "default_sell_price_per_pack can't be negative"
        )]
    );
    assert_eq!(summary.tables[0].updated, 2);
}

// covers: OMS-REG-CDIO-01.207

#[actix_rt::test]
async fn an_item_store_join_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = item_store_setup("central_data_item_store_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();

    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            item_store_row(&[
                ("id", "isj_ward_para"),
                ("ignore_for_orders", "maybe"),
                ("default_location_code", "FRIDGE"),
                ("default_sell_price_per_pack", "-1"),
            ]),
            item_store_row(&[
                ("item_code", "IBU"),
                ("store_code", "W1"),
                ("margin", "x"),
                ("default_location_id", "fridge_main"),
                ("default_sell_price_per_pack", "-2"),
            ]),
            // A missing item still leaves the location and price to check.
            new_item_store_row(&[
                ("item_code", "NOPE"),
                ("store_code", "W1"),
                ("default_location_code", "FRIDGE"),
                ("default_sell_price_per_pack", "-3"),
            ]),
            // Found by id, with a store not found: not a duplicate of Ibuprofen in the saved
            // join's store.
            item_store_row(&[
                ("id", "isj_main_para"),
                ("item_code", "IBU"),
                ("store_code", "NOPE"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    let fridge = "FRIDGE is a location of store MS, not of store W1";
    let negative = "default_sell_price_per_pack can't be negative";
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("ignore_for_orders"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            ),
            (2, Some("default_location_code"), fridge),
            (2, Some("default_sell_price_per_pack"), negative),
            (3, Some("margin"), "\"x\" must be a number"),
            (
                3,
                Some("ignore_for_orders"),
                "ignore_for_orders is required for a new item in a store"
            ),
            (3, Some("default_location_id"), fridge),
            (3, Some("default_sell_price_per_pack"), negative),
            (4, Some("item_code"), "item_code \"NOPE\" not found"),
            (4, Some("default_location_code"), fridge),
            (4, Some("default_sell_price_per_pack"), negative),
            (5, Some("store_code"), "store_code \"NOPE\" not found"),
        ]
    );
}

// covers: OMS-REG-CDIO-01.200

#[actix_rt::test]
async fn an_item_store_join_delete_row_with_a_missing_reference_applies_nothing() {
    let (connection, service_provider, dir) =
        item_store_setup("central_data_item_store_delete_missing").await;
    let ctx = service_provider.basic_context().unwrap();
    let before = item_store_joins_of(&connection, "store_main");

    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            item_store_row(&[
                ("item_code", "PARA"),
                ("store_code", "MS"),
                ("delete", "DELETE"),
            ]),
            item_store_row(&[
                ("item_code", "IBU"),
                ("store_code", "NOPE"),
                ("delete", "DELETE"),
            ]),
        ]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![(3, Some("store_code"), "store_code \"NOPE\" not found")]
    );
    assert_eq!(item_store_joins_of(&connection, "store_main"), before);
}

// covers: OMS-REG-CDIO-01.201

#[actix_rt::test]
async fn an_item_store_join_finds_an_item_and_store_earlier_sheets_add() {
    let (connection, service_provider, dir) =
        item_store_setup("central_data_item_store_earlier_sheets").await;
    let ctx = service_provider.basic_context().unwrap();

    // Sheets run in table order, not file order.
    let path = write_file(
        dir.path(),
        sheet::write(vec![
            item_store_sheet_data(vec![new_item_store_row(&[
                ("item_code", "AMOX"),
                ("store_code", "W2"),
                ("default_sell_price_per_pack", "0.5"),
            ])]),
            sheet_data(
                "store",
                &STORE_HEADERS,
                vec![new_store_row(&[
                    ("code", "W2"),
                    ("name_code", "WARD"),
                    ("name_type", "STORE"),
                ])],
            ),
            sheet_data("item", &ITEM_HEADERS, vec![new_item("AMOX", "", "", "")]),
        ])
        .unwrap(),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    let amoxicillin = find_item(&connection, "AMOX");
    let joins = item_store_joins_of(&connection, &store_by_code(&connection, "W2").id);
    assert_eq!(joins.len(), 1);
    assert_eq!(
        (&joins[0].item_id, joins[0].default_sell_price_per_pack),
        (&amoxicillin.id, 0.5)
    );
}

// covers: OMS-REG-CDIO-01.202

#[actix_rt::test]
async fn two_saved_item_store_joins_for_one_item_and_store_are_found_by_id() {
    let (connection, service_provider, dir) =
        item_store_setup("central_data_item_store_shared_pair").await;
    let ctx = service_provider.basic_context().unwrap();
    // A join for another item, merged into Paracetamol since: both joins now hold Paracetamol.
    ItemRowRepository::new(&connection)
        .upsert_one(&ItemRow {
            id: "old_para".to_string(),
            code: "PARA-OLD".to_string(),
            name: "Paracetamol (old)".to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap();
    add_item_store_join(
        &connection,
        ItemStoreJoinRow {
            id: "isj_main_old_para".to_string(),
            item_id: "old_para".to_string(),
            store_id: "store_main".to_string(),
            default_sell_price_per_pack: 3.0,
            ..Default::default()
        },
    );
    ItemLinkRowRepository::new(&connection)
        .upsert_one(&ItemLinkRow {
            id: "old_para".to_string(),
            item_id: "paracetamol".to_string(),
        })
        .unwrap();
    let ids = |connection: &StorageConnection| -> Vec<(String, String)> {
        item_store_joins_of(connection, "store_main")
            .into_iter()
            .map(|join| (join.id, join.item_id))
            .collect()
    };
    let shared = |id: &str| (id.to_string(), "paracetamol".to_string());
    assert_eq!(
        ids(&connection),
        [
            ("isj_main_ibu".to_string(), "ibuprofen".to_string()),
            shared("isj_main_old_para"),
            shared("isj_main_para"),
        ]
    );

    // An export writes both, and imports unchanged.
    let bytes = CentralDataService
        .export(&ctx, &[item_stores_containing(None)])
        .unwrap();
    let path = write_file(dir.path(), bytes);
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].unchanged, 4);

    let path = write_file(
        dir.path(),
        item_store_sheet(vec![
            // Without an id, the pair finds both.
            item_store_row(&[("item_code", "PARA"), ("store_code", "MS"), ("margin", "9")]),
            item_store_row(&[
                ("item_code", "PARA"),
                ("store_code", "MS"),
                ("delete", "DELETE"),
            ]),
            // With one, it settles which.
            item_store_row(&[
                ("id", "isj_main_old_para"),
                ("item_code", "PARA"),
                ("store_code", "MS"),
                ("margin", "4"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    let ambiguous = "ambiguous reference, please provide id instead";
    assert_eq!(
        row_errors(&summary),
        vec![(2, Some("id"), ambiguous), (3, Some("id"), ambiguous)]
    );
    assert_eq!(summary.tables[0].updated, 1);

    // A DELETE row with an id removes that join alone.
    let path = write_file(
        dir.path(),
        item_store_sheet(vec![item_store_row(&[
            ("id", "isj_main_old_para"),
            ("delete", "DELETE"),
        ])]),
    );
    let summary = CentralDataService
        .import(&ctx, &path, &no_sessions(), today())
        .unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables[0].deleted, 1);
    assert_eq!(
        ids(&connection),
        [
            ("isj_main_ibu".to_string(), "ibuprofen".to_string()),
            shared("isj_main_para"),
        ]
    );
}

// One upload shows every error on a row, on every sheet.

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_unit_row_lists_all_its_errors_at_once() {
    let (_, connection, connection_manager, _) =
        setup_all("central_data_unit_all_errors", MockDataInserts::none()).await;
    let ctx = ServiceProvider::new(connection_manager)
        .basic_context()
        .unwrap();
    let dir = TempDir::new().unwrap();
    for (id, name) in [("box", "Box"), ("bag", "Bag")] {
        UnitRowRepository::new(&connection)
            .upsert_one(&UnitRow {
                id: id.to_string(),
                name: name.to_string(),
                index: 1,
                is_active: true,
                ..Default::default()
            })
            .unwrap();
    }
    // Renaming Bag to Box, with an index that isn't a number.
    let path = write_file(
        dir.path(),
        unit_sheet(
            vec!["id", "name", "description", "index", "is_active"],
            vec![
                vec![
                    "bag".to_string().into(),
                    "Box".to_string().into(),
                    Value::Empty,
                    "x".to_string().into(),
                    true.into(),
                ],
                // A blank name is only "required", not also a duplicate.
                vec![
                    Value::Empty,
                    Value::Empty,
                    Value::Empty,
                    "x".to_string().into(),
                    true.into(),
                ],
                // Not a duplicate by the is_active its cell's error left.
                vec![
                    "bag".to_string().into(),
                    "Box".to_string().into(),
                    Value::Empty,
                    Value::Empty,
                    "maybe".to_string().into(),
                ],
            ],
        ),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("index"), "\"x\" must be a whole number"),
            (
                2,
                Some("name"),
                "Unit box is already named Box. Give this unit another name, or make one of them inactive"
            ),
            (3, Some("index"), "\"x\" must be a whole number"),
            (3, Some("name"), "name is required for a new unit"),
            (
                4,
                Some("is_active"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            )
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_location_type_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = location_type_setup("central_data_lt_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        location_type_sheet(vec![
            // Max isn't compared with a min its cell's error left.
            location_type_row(["", "LT1", "Cold", "x", "-5", ""]),
            location_type_row(["", "LT2", "Warm", "8", "2", "REMOVE"]),
            // A blank key hides no other error.
            location_type_row(["", "", "Chilly", "8", "2", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("min_temperature"), "\"x\" must be a number"),
            (
                3,
                Some("delete"),
                "\"REMOVE\" is not valid. Type DELETE to delete this row, or leave it blank"
            ),
            (
                3,
                Some("max_temperature"),
                "max_temperature 2 is below min_temperature 8"
            ),
            (4, Some("code"), "code is required for a new location type"),
            (
                4,
                Some("max_temperature"),
                "max_temperature 2 is below min_temperature 8"
            )
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_currency_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = currency_setup("central_data_currency_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        currency_sheet(vec![
            currency_row(["", "USD", "-1", "maybe", "", "TRUE"]),
            // A blank key hides no other error.
            currency_row(["", "", "-1", "FALSE", "", "TRUE"]),
            // At most one error per column: not also "a home currency's rate must be 1".
            currency_row(["", "EUR", "-1", "TRUE", "", "TRUE"]),
            // The saved home currency: its rate and is_active aren't checked against the flag
            // the bad cell left.
            currency_row(["", "USD", "1.2", "maybe", "", "FALSE"]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("is_home_currency"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            ),
            (2, Some("rate"), "rate must be above 0"),
            (3, Some("code"), "code is required for a new currency"),
            (3, Some("rate"), "rate must be above 0"),
            (4, Some("rate"), "rate must be above 0"),
            (
                5,
                Some("is_home_currency"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            )
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_master_list_row_lists_all_its_errors_at_once() {
    let (connection, service_provider, dir) =
        master_list_setup("central_data_master_list_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();
    MasterListRowRepository::new(&connection)
        .upsert_one(&MasterListRow {
            id: "coded".to_string(),
            name: "Coded list".to_string(),
            code: "CODED".to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap();
    let path = write_file(
        dir.path(),
        master_list_sheet(vec![
            master_list_row(["", "CODED", "Another list", "", "TRUE", "FALSE", "abc"]),
            // A blank key hides no other error.
            master_list_row(["", "CODED", "", "", "TRUE", "FALSE", ""]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("discount_percentage"), "\"abc\" must be a number"),
            (2, Some("code"), "Master list coded already has code CODED"),
            (3, Some("name"), "name is required for a new master list"),
            (3, Some("code"), "Master list coded already has code CODED")
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_name_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = name_setup("central_data_name_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        name_sheet(vec![
            new_name_row(&[
                ("code", "N1"),
                ("type", "FACILITY"),
                ("name", "Clinic X"),
                ("on_hold", "maybe"),
                ("custom_data", "{bad"),
            ]),
            // A blank key hides no other error.
            new_name_row(&[
                ("type", "FACILITY"),
                ("name", "Clinic Y"),
                ("custom_data", "{bad"),
            ]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("on_hold"), "\"maybe\" must be TRUE, FALSE, 1 or 0"),
            (2, Some("custom_data"), "custom_data must be JSON, or blank"),
            (3, Some("code"), "code is required for a new name"),
            (3, Some("custom_data"), "custom_data must be JSON, or blank")
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_store_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = store_setup("central_data_store_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        store_sheet(vec![
            new_store_row(&[
                ("code", "NEW"),
                ("site_id", "99"),
                ("is_disabled", "maybe"),
                ("name_code", "WARD"),
                ("name_type", "STORE"),
            ]),
            // A blank key hides no other error.
            new_store_row(&[
                ("site_id", "99"),
                ("name_code", "WARD"),
                ("name_type", "STORE"),
            ]),
            // A missing name is only "required", not also "not found".
            new_store_row(&[("code", "NEW2"), ("site_id", "99")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("is_disabled"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            ),
            (2, Some("site_id"), "Site 99 isn't on this server"),
            (3, Some("code"), "code is required for a new store"),
            (3, Some("site_id"), "Site 99 isn't on this server"),
            (
                4,
                Some("name_code"),
                "name_code is required for a new store"
            ),
            (4, Some("site_id"), "Site 99 isn't on this server")
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_name_store_join_row_lists_all_its_errors_at_once() {
    let (connection, service_provider, dir) = join_setup("central_data_join_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();
    StoreRowRepository::new(&connection)
        .upsert_one(&StoreRow {
            id: "store_ward".to_string(),
            code: "W1".to_string(),
            name_id: "ward_name".to_string(),
            site_id: 1,
            ..Default::default()
        })
        .unwrap();
    let path = write_file(
        dir.path(),
        join_sheet(vec![
            join_row(&[
                ("store_code", "W1"),
                ("name_id", "closed"),
                ("name_is_customer", "maybe"),
            ]),
            // Without its store, whether the row adds a join isn't known: no "required".
            join_row(&[("store_code", "NOPE"), ("name_id", "clinic")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("name_is_customer"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            ),
            (
                2,
                Some("name_is_supplier"),
                "name_is_supplier is required for a new name in a store"
            ),
            (
                2,
                Some("name_id"),
                "Closed clinic (CL2) is deleted, so a store can't be given it"
            ),
            (3, Some("store_code"), "store_code \"NOPE\" not found")
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_user_permission_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = permission_setup("central_data_permission_all_errors").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let path = write_file(
        dir.path(),
        permission_sheet(vec![permission_row(&[
            ("username", "carl"),
            ("store_code", "MS"),
            ("permission", "STORE_ACCESS"),
            ("context_name", "Nope"),
        ])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("context_name"), "context_name \"Nope\" not found"),
            (
                2,
                Some("username"),
                "carl is deleted, so they can't be given a permission"
            )
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_user_store_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = user_store_setup("central_data_user_store_all_errors").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let path = write_file(
        dir.path(),
        user_store_sheet(vec![user_store_row(&[
            ("username", "carl"),
            ("store_id", &mock_store_a().id),
            ("is_default", "maybe"),
        ])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("is_default"),
                "\"maybe\" must be TRUE, FALSE, 1 or 0"
            ),
            (
                2,
                Some("username"),
                "carl is deleted, so they can't be given a store"
            )
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_master_list_line_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = line_setup("central_data_line_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        line_sheet(vec![line_row(&[
            ("master_list_name", "Clinic list"),
            ("item_code", "NOPE"),
            ("price_per_unit", "-1"),
        ])]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (2, Some("item_code"), "item_code \"NOPE\" not found"),
            (
                2,
                Some("price_per_unit"),
                "price_per_unit can't be negative"
            )
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_master_list_name_join_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir) = name_join_setup("central_data_name_join_all_errors").await;
    let ctx = service_provider.basic_context().unwrap();
    let path = write_file(
        dir.path(),
        name_join_sheet(vec![
            name_join_row(&[("master_list_name", "Nope"), ("name_id", "patient")]),
            name_join_row(&[("master_list_id", MISSING_PROGRAM), ("name_code", "CL2")]),
            // Found by id when a reference isn't: its saved patient and placeholder master list
            // aren't errors on the column that already has one.
            name_join_row(&[("id", "mlnj_eml_patient"), ("name_code", "NOPE")]),
            name_join_row(&[("id", "mlnj_missing"), ("master_list_name", "Nope")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("master_list_name"),
                "master_list_name \"Nope\" not found"
            ),
            (
                2,
                Some("name_id"),
                "Moreau, Anna (P001) is a patient, so import doesn't change which master lists are given to a patient"
            ),
            (
                3,
                Some("master_list_id"),
                "missing_program is protected, as the server needs it, so import can't change which names it's given to"
            ),
            (
                3,
                Some("name_code"),
                "Closed clinic (CL2) is deleted, so it can't be given a master list"
            ),
            (4, Some("name_code"), "name_code \"NOPE\" not found"),
            (
                5,
                Some("master_list_name"),
                "master_list_name \"Nope\" not found"
            )
        ]
    );
}

// covers: OMS-REG-CDIO-01.208

#[actix_rt::test]
async fn a_user_row_lists_all_its_errors_at_once() {
    let (_, service_provider, dir, _) = user_setup("central_data_user_all_errors").await;
    let ctx = as_user(&service_provider, IMPORTER);
    let path = write_file(
        dir.path(),
        user_sheet(vec![
            user_row("", "\tbob", &[(2, "secret12"), (4, "KLINGON")]),
            // A blank username is only "required".
            user_row("", "", &[(2, "secret12"), (4, "KLINGON")]),
        ]),
    );
    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(
        row_errors(&summary),
        vec![
            (
                2,
                Some("language"),
                "\"KLINGON\" must be one of ENGLISH, FRENCH, SPANISH, LAOS, KHMER, PORTUGUESE, RUSSIAN, TETUM"
            ),
            (
                2,
                Some("username"),
                "username can't start or end with a tab or line break"
            ),
            (
                3,
                Some("language"),
                "\"KLINGON\" must be one of ENGLISH, FRENCH, SPANISH, LAOS, KHMER, PORTUGUESE, RUSSIAN, TETUM"
            ),
            (3, Some("username"), "username is required for a new user")
        ]
    );
}
