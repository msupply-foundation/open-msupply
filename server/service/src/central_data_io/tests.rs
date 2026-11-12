use super::{
    CentralDataService, CentralDataServiceTrait, CentralDataTable, Change, ExportCount,
    ExportError, ExportFilter, ExportTable, FieldChange, MAX_IMPORT_ROWS, MAX_ROWS_LISTED,
    RecordCount, RowChange, TableChanges,
    sheet::{self, SheetData, Value},
};
use crate::service_provider::ServiceProvider;
use repository::{
    StorageConnection, UnitRow, UnitRowRepository, mock::MockDataInserts, test_db::setup_all,
};
use std::path::{Path, PathBuf};
use tempfile::TempDir;

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

    let summary = CentralDataService.import(&ctx, &path).unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(0, 0, 3));
    assert_eq!(summary.changes, vec![]);
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
        (1, Some("nmae"))
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
                    "is_active: \"yes\" must be TRUE or FALSE"
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
        .import(&ctx, &write_file(dir.path(), fixed))
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

    let summary = CentralDataService.import(&ctx, &path).unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.row, e.column.as_deref(), e.message.as_str()))
        .collect();
    assert_eq!(
        errors,
        vec![(4, Some("index"), "\"abc\" must be a whole number")]
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

    let summary = CentralDataService.import(&ctx, &path).unwrap();
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

    let summary = CentralDataService.import(&ctx, &path).unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.sheet.as_str(), e.row, e.column.as_deref()))
        .collect();
    assert_eq!(
        errors,
        vec![
            ("units", 1, None),
            ("unit", 1, Some("nmae")),
            ("unit", 3, None),
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
            (1, Some("name"), "This column appears twice"),
            (1, None, "Column E has values but no heading"),
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

    let summary = CentralDataService.import(&ctx, &path).unwrap();
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

    let summary = CentralDataService.import(&ctx, &path).unwrap();
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

    let summary = CentralDataService.import(&ctx, &path).unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(0, 1, 3));
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
    assert_eq!((error.row, error.column.as_deref()), (2, Some("name")));
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

    let summary = CentralDataService.import(&ctx, &path).unwrap();
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

// covers: OMS-REG-CDIO-01.40

#[actix_rt::test]
async fn a_name_in_another_letter_case_adds_a_unit() {
    let (_, connection, connection_manager, _) = setup_all(
        "central_data_lookup_letter_case",
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
            vec!["name", "index", "is_active"],
            vec![vec![
                existing.name.to_uppercase().into(),
                existing.index.into(),
                true.into(),
            ]],
        ),
    );

    let summary = CentralDataService.preview_import(&ctx, &path).unwrap();
    assert_eq!(summary.errors, vec![]);
    assert_eq!(summary.tables, unit_changes(1, 0, 0));
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
    let bottle = |id: &str, is_active| UnitRow {
        id: id.to_string(),
        name: "Bottle".to_string(),
        description: None,
        index: 7,
        is_active,
    };
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

    let summary = CentralDataService.import(&ctx, &path).unwrap();
    let errors: Vec<_> = summary
        .errors
        .iter()
        .map(|e| (e.row, e.column.as_deref(), e.message.as_str()))
        .collect();
    assert_eq!(
        errors,
        vec![(4, Some("index"), "index is required for a new unit")]
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
    let summary = CentralDataService.import(&ctx, &path).unwrap();
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
    assert_eq!(summary.errors[0].row, 2);
}
