use crate::service_provider::ServiceContext;
use cells::{Row, RowError};
use repository::{RepositoryError, StorageConnection};
use std::{collections::HashMap, path::Path};
use umya_spreadsheet::helper::coordinate::string_from_column_index;

pub mod cells;
pub mod delete;
mod item;
mod location_type;
pub mod lookup;
pub mod sheet;
mod unit;

#[cfg(test)]
mod tests;

/// shortcut: one cap for the whole file; raise it if a catalogue needs more.
pub const MAX_IMPORT_ROWS: usize = 100_000;

/// Rows listed in a summary; its counts include every row.
pub const MAX_ROWS_LISTED: usize = 100;

/// Added by the errors file and ignored on import, so a fixed errors file imports as it is.
pub const ERROR_COLUMN: &str = "error";

/// One variant per table, added with the table.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CentralDataTable {
    Unit,
    LocationType,
    Item,
}

/// Empty exports every record.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ExportFilter {
    /// Any letter case; each table picks the fields it searches.
    pub contains: Option<String>,
    /// Ignored by a table with no active flag.
    pub is_active: Option<bool>,
}

impl ExportFilter {
    /// `is_active` is `None` for a table with no active flag. Filters in memory, so for small
    /// tables only; a big join table filters and counts in SQL with the repository filters.
    pub(crate) fn matches(&self, search: &[&str], is_active: Option<bool>) -> bool {
        let text_matches = match self.contains.as_deref().map(str::trim) {
            None | Some("") => true,
            Some(text) => {
                let text = text.to_lowercase();
                search
                    .iter()
                    .any(|field| field.to_lowercase().contains(&text))
            }
        };
        let flag_matches = match (self.is_active, is_active) {
            (Some(wanted), Some(flag)) => wanted == flag,
            _ => true,
        };
        text_matches && flag_matches
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExportTable {
    pub table: CentralDataTable,
    pub filter: ExportFilter,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RecordCount {
    pub matching: u32,
    pub total: u32,
}

impl RecordCount {
    /// For a table small enough to filter in memory.
    pub fn in_memory<R>(rows: &[R], matches: impl Fn(&R) -> bool) -> Self {
        RecordCount {
            matching: rows.iter().filter(|row| matches(row)).count() as u32,
            total: rows.len() as u32,
        }
    }
}

#[derive(Debug, PartialEq)]
pub struct ExportCount {
    pub table: CentralDataTable,
    pub count: RecordCount,
}

impl CentralDataTable {
    pub fn sheet_name(&self) -> &'static str {
        match self {
            CentralDataTable::Unit => "unit",
            CentralDataTable::LocationType => "location_type",
            CentralDataTable::Item => "item",
        }
    }
}

/// In import order, so a sheet can refer to rows an earlier sheet adds.
static TABLES: &[&(dyn ImportTable + Sync)] = &[
    &unit::UnitTable,
    &location_type::LocationTypeTable,
    &item::ItemTable,
];

pub(crate) trait ImportTable {
    fn table(&self) -> CentralDataTable;
    /// Read on import, in export order.
    fn columns(&self) -> &'static [&'static str];
    /// Formatted as Text in an export, so leading zeros survive, in typed rows too.
    fn text_columns(&self) -> &'static [&'static str];
    /// Exported after `columns` for reference; ignored on import.
    fn export_only_columns(&self) -> &'static [&'static str] {
        &[]
    }
    fn has_column(&self, header: &str) -> bool {
        self.columns().contains(&header) || self.export_only_columns().contains(&header)
    }
    /// One value per column: `columns` then `export_only_columns`.
    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<sheet::Value>>, RepositoryError>;
    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError>;
    /// Loads the sheet's lookups once, so rows don't each query them.
    fn start_sheet(
        &self,
        connection: &StorageConnection,
    ) -> Result<Box<dyn SheetImport>, RepositoryError>;
}

/// Each row sees the writes of the rows before it.
pub(crate) trait SheetImport {
    /// Writes nothing when the row has errors.
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure>;
}

pub(crate) struct RowOutcome {
    pub record_id: String,
    /// Shown in the preview, such as the record's name.
    pub record: String,
    pub change: Change,
    /// For an update, the columns that change.
    pub fields: Vec<FieldChange>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Change {
    Inserted,
    Updated,
    Deleted,
    Unchanged,
}

impl Change {
    /// What writing `new` over `saved` does. Making an active record inactive is a delete.
    pub fn between<R: PartialEq>(
        saved: Option<&R>,
        new: &R,
        is_active: impl Fn(&R) -> bool,
    ) -> Self {
        match saved {
            Some(saved) if saved == new => Change::Unchanged,
            Some(saved) if is_active(saved) && !is_active(new) => Change::Deleted,
            Some(_) => Change::Updated,
            None => Change::Inserted,
        }
    }

    /// As `between`, for a table whose updates never delete: it deletes by its `delete` column.
    pub fn between_upserts<R: PartialEq>(saved: Option<&R>, new: &R) -> Self {
        Self::between(saved, new, |_| true)
    }
}

/// How the preview and messages name a record whose name can repeat.
pub(crate) fn name_with_code(name: &str, code: &str) -> String {
    format!("{name} ({code})")
}

pub(crate) enum RowFailure {
    Invalid(Vec<RowError>),
    Database(RepositoryError),
}

impl From<RepositoryError> for RowFailure {
    fn from(error: RepositoryError) -> Self {
        RowFailure::Database(error)
    }
}

impl From<RowError> for RowFailure {
    fn from(error: RowError) -> Self {
        RowFailure::Invalid(vec![error])
    }
}

#[derive(Debug, PartialEq)]
pub struct TableChanges {
    pub table: CentralDataTable,
    pub inserted: u32,
    pub updated: u32,
    pub deleted: u32,
    pub unchanged: u32,
    /// Heading errors included.
    pub error_count: u32,
}

#[derive(Debug, PartialEq)]
pub struct FieldChange {
    pub column: &'static str,
    pub from: String,
    pub to: String,
}

/// The columns whose value differs, given each record's cells in `columns` order.
pub fn field_changes(
    columns: &[&'static str],
    old: Vec<sheet::Value>,
    new: Vec<sheet::Value>,
) -> Vec<FieldChange> {
    debug_assert_eq!((old.len(), new.len()), (columns.len(), columns.len()));
    columns
        .iter()
        .zip(old.iter().zip(&new))
        .map(|(column, (from, to))| (*column, from.display(), to.display()))
        .filter(|(_, from, to)| from != to)
        .map(|(column, from, to)| FieldChange { column, from, to })
        .collect()
}

#[derive(Debug, PartialEq)]
pub struct RowChange {
    pub sheet: String,
    pub row: u32,
    pub record: String,
    pub change: Change,
    pub fields: Vec<FieldChange>,
}

#[derive(Debug)]
pub struct ImportSummary {
    pub tables: Vec<TableChanges>,
    /// The first `MAX_ROWS_LISTED`, in sheet order.
    pub changes: Vec<RowChange>,
    /// The first `errors_listed`, heading errors first.
    pub errors: Vec<RowError>,
    /// Every row error. With any, nothing was applied.
    pub error_count: u32,
    errors_listed: usize,
}

impl ImportSummary {
    fn new(errors_listed: usize) -> Self {
        ImportSummary {
            tables: Vec::new(),
            changes: Vec::new(),
            errors: Vec::new(),
            error_count: 0,
            errors_listed,
        }
    }

    fn add_errors(&mut self, errors: impl IntoIterator<Item = RowError>) {
        for error in errors {
            self.error_count += 1;
            if self.errors.len() < self.errors_listed {
                self.errors.push(error);
            }
        }
    }
}

#[derive(Debug)]
pub enum ImportError {
    CannotReadFile(String),
    CannotWriteFile(String),
    TooManyRows {
        row_count: usize,
    },
    /// Over `sheet::MAX_CELLS`, counting each sheet from its first used cell to its last.
    TooManyCells {
        cell_count: usize,
    },
    DatabaseError(RepositoryError),
}

#[derive(Debug)]
pub enum ExportError {
    /// Over the import cap, so the file couldn't be imported again.
    TooManyRows {
        row_count: usize,
    },
    CannotWriteFile(String),
    DatabaseError(RepositoryError),
}

pub trait CentralDataServiceTrait: Sync + Send {
    /// Refused over the import cap.
    fn export(&self, ctx: &ServiceContext, tables: &[ExportTable]) -> Result<Vec<u8>, ExportError> {
        export(&ctx.connection, tables, MAX_IMPORT_ROWS)
    }

    /// In table order.
    fn export_counts(
        &self,
        ctx: &ServiceContext,
        tables: &[ExportTable],
    ) -> Result<Vec<ExportCount>, RepositoryError> {
        export_counts(&ctx.connection, tables)
    }

    fn preview_import(
        &self,
        ctx: &ServiceContext,
        path: &Path,
    ) -> Result<ImportSummary, ImportError> {
        run_import(&ctx.connection, path, false)
    }

    fn import(&self, ctx: &ServiceContext, path: &Path) -> Result<ImportSummary, ImportError> {
        run_import(&ctx.connection, path, true)
    }

    /// The upload with each row's errors in an `error` column. Writes nothing.
    fn import_errors_file(
        &self,
        ctx: &ServiceContext,
        path: &Path,
    ) -> Result<Vec<u8>, ImportError> {
        errors_file(&ctx.connection, path)
    }
}

pub struct CentralDataService;
impl CentralDataServiceTrait for CentralDataService {}

/// In table order.
fn requested(
    tables: &[ExportTable],
) -> impl Iterator<Item = (&'static (dyn ImportTable + Sync), &ExportFilter)> {
    TABLES.iter().filter_map(|table| {
        tables
            .iter()
            .find(|requested| requested.table == table.table())
            .map(|requested| (*table, &requested.filter))
    })
}

fn export_counts(
    connection: &StorageConnection,
    tables: &[ExportTable],
) -> Result<Vec<ExportCount>, RepositoryError> {
    requested(tables)
        .map(|(table, filter)| {
            Ok(ExportCount {
                table: table.table(),
                count: table.count(connection, filter)?,
            })
        })
        .collect()
}

fn export(
    connection: &StorageConnection,
    tables: &[ExportTable],
    max_rows: usize,
) -> Result<Vec<u8>, ExportError> {
    // Counted first, so a file too big to import again isn't built.
    let row_count: usize = export_counts(connection, tables)
        .map_err(ExportError::DatabaseError)?
        .iter()
        .map(|count| count.count.matching as usize)
        .sum();
    if row_count > max_rows {
        return Err(ExportError::TooManyRows { row_count });
    }

    let sheets = requested(tables)
        .map(|(table, filter)| {
            Ok(sheet::SheetData {
                name: table.table().sheet_name().to_string(),
                header_row: 1,
                first_column: 1,
                headers: [table.columns(), table.export_only_columns()]
                    .concat()
                    .into_iter()
                    .map(str::to_string)
                    .collect(),
                text_columns: table.text_columns().to_vec(),
                rows: table.export(connection, filter)?,
            })
        })
        .collect::<Result<Vec<_>, RepositoryError>>()
        .map_err(ExportError::DatabaseError)?;
    sheet::write(sheets).map_err(ExportError::CannotWriteFile)
}

enum Outcome {
    RolledBack(ImportSummary),
    Database(RepositoryError),
}

impl From<RepositoryError> for Outcome {
    fn from(error: RepositoryError) -> Self {
        Outcome::Database(error)
    }
}

fn run_import(
    connection: &StorageConnection,
    path: &Path,
    commit: bool,
) -> Result<ImportSummary, ImportError> {
    let sheets = read_file(path)?;
    run_sheets(connection, &sheets, commit, MAX_ROWS_LISTED)
}

fn read_file(path: &Path) -> Result<Vec<sheet::Sheet>, ImportError> {
    sheet::read(path, MAX_IMPORT_ROWS).map_err(|error| match error {
        sheet::ReadError::Unreadable(reason) => ImportError::CannotReadFile(reason),
        sheet::ReadError::TooManyRows(row_count) => ImportError::TooManyRows { row_count },
        sheet::ReadError::TooManyCells(cell_count) => ImportError::TooManyCells { cell_count },
    })
}

fn run_sheets(
    connection: &StorageConnection,
    sheets: &[sheet::Sheet],
    commit: bool,
    errors_listed: usize,
) -> Result<ImportSummary, ImportError> {
    // Never an outer transaction, so a preview always rolls back.
    // shortcut: on SQLite this holds the only write lock for the whole file, preview and errors
    // file included, so other writes (sync, app edits) fail as locked once it passes
    // SQLITE_LOCKWAIT_MS (30s). Fine on Postgres; batch the rows if a SQLite central needs more.
    let result = connection
        .transaction_sync_etc(
            |connection| {
                let summary = import_sheets(connection, sheets, errors_listed)?;
                if commit && summary.error_count == 0 {
                    Ok(summary)
                } else {
                    Err(Outcome::RolledBack(summary))
                }
            },
            false,
        )
        .map_err(|error| error.to_inner_error());

    match result {
        Ok(summary) | Err(Outcome::RolledBack(summary)) => Ok(summary),
        Err(Outcome::Database(error)) => Err(ImportError::DatabaseError(error)),
    }
}

fn find_table(sheet: &sheet::Sheet) -> Option<&'static (dyn ImportTable + Sync)> {
    TABLES
        .iter()
        .find(|table| sheet.name.eq_ignore_ascii_case(table.table().sheet_name()))
        .copied()
}

fn import_sheets(
    connection: &StorageConnection,
    sheets: &[sheet::Sheet],
    errors_listed: usize,
) -> Result<ImportSummary, RepositoryError> {
    let mut summary = ImportSummary::new(errors_listed);

    for sheet in sheets {
        if find_table(sheet).is_none() && !sheet.headers.is_empty() {
            let names: Vec<_> = TABLES.iter().map(|t| t.table().sheet_name()).collect();
            summary.add_errors([RowError {
                sheet: sheet.name.clone(),
                row: sheet.header_row,
                column: None,
                message: format!(
                    "Unknown sheet. Name each sheet after the table it holds: {}",
                    names.join(", ")
                ),
            }]);
        }
    }

    // Heading errors first: the errors file has no row for them, so the preview must list them.
    let mut table_sheets = Vec::new();
    for table in TABLES {
        let Some(sheet) = sheets
            .iter()
            .find(|sheet| find_table(sheet).is_some_and(|found| found.table() == table.table()))
        else {
            continue;
        };
        let errors_before = summary.error_count;
        summary.add_errors(check_headers(*table, sheet));
        table_sheets.push((*table, sheet, summary.error_count - errors_before));
    }

    for (table, sheet, heading_errors) in table_sheets {
        let row_errors_before = summary.error_count;

        let mut changes = TableChanges {
            table: table.table(),
            inserted: 0,
            updated: 0,
            deleted: 0,
            unchanged: 0,
            error_count: 0,
        };
        let mut rows = table.start_sheet(connection)?;
        // Record id → first row that changes it.
        let mut seen: HashMap<String, u32> = HashMap::new();
        for sheet_row in &sheet.rows {
            let row = Row {
                sheet: &sheet.name,
                number: sheet_row.number,
                headers: &sheet.headers,
                cells: &sheet_row.cells,
            };
            let outcome = match rows.import_row(connection, &row) {
                Ok(outcome) => outcome,
                Err(RowFailure::Invalid(errors)) => {
                    summary.add_errors(errors);
                    continue;
                }
                Err(RowFailure::Database(error)) => return Err(error),
            };
            // Unchanged rows may repeat; two rows changing one record can't.
            let count = match outcome.change {
                Change::Inserted => &mut changes.inserted,
                Change::Updated => &mut changes.updated,
                Change::Deleted => &mut changes.deleted,
                Change::Unchanged => {
                    changes.unchanged += 1;
                    continue;
                }
            };
            let first = *seen.entry(outcome.record_id).or_insert(row.number);
            if first != row.number {
                summary.add_errors([RowError {
                    sheet: sheet.name.clone(),
                    row: row.number,
                    column: None,
                    message: format!("Row {first} already changes this record"),
                }]);
                continue;
            }
            *count += 1;
            if summary.changes.len() < MAX_ROWS_LISTED {
                summary.changes.push(RowChange {
                    sheet: sheet.name.clone(),
                    row: row.number,
                    record: outcome.record,
                    change: outcome.change,
                    fields: outcome.fields,
                });
            }
        }
        changes.error_count = heading_errors + (summary.error_count - row_errors_before);
        summary.tables.push(changes);
    }
    Ok(summary)
}

/// So a misspelt column isn't silently dropped.
fn check_headers(table: &dyn ImportTable, sheet: &sheet::Sheet) -> Vec<RowError> {
    let header_error = |column: &str, message: String| RowError {
        sheet: sheet.name.clone(),
        row: sheet.header_row,
        column: (!column.is_empty()).then(|| column.to_string()),
        message,
    };
    let mut errors = Vec::new();
    for (position, header) in sheet.headers.iter().enumerate() {
        if header == ERROR_COLUMN {
            continue;
        }
        if header.is_empty() {
            let column_used = sheet
                .rows
                .iter()
                .any(|row| row.cells.get(position).is_some_and(|cell| !cell.is_empty()));
            if column_used {
                let column = string_from_column_index(&(sheet.first_column + position as u32));
                errors.push(header_error(
                    "",
                    format!("Column {column} has values but no heading"),
                ));
            }
        } else if !table.has_column(header) {
            errors.push(header_error(
                header,
                format!(
                    "Unknown column. The {} sheet can have: {}",
                    sheet.name,
                    [table.columns(), table.export_only_columns()]
                        .concat()
                        .join(", ")
                ),
            ));
        } else if sheet.headers[..position].contains(header) {
            errors.push(header_error(
                header,
                "This column appears twice".to_string(),
            ));
        }
    }
    errors
}

fn errors_file(connection: &StorageConnection, path: &Path) -> Result<Vec<u8>, ImportError> {
    let sheets = read_file(path)?;
    let summary = run_sheets(connection, &sheets, false, usize::MAX)?;
    sheet::write(errors_file_sheets(&sheets, &summary.errors)).map_err(ImportError::CannotWriteFile)
}

/// Rows keep their numbers, so a message naming another row still matches. Table sheets get a
/// fresh `error` column; other sheets are copied as they are.
fn errors_file_sheets(sheets: &[sheet::Sheet], errors: &[RowError]) -> Vec<sheet::SheetData> {
    let mut by_row: HashMap<(&str, u32), Vec<String>> = HashMap::new();
    for error in errors {
        let text = match &error.column {
            Some(column) => format!("{column}: {}", error.message),
            None => error.message.clone(),
        };
        by_row
            .entry((error.sheet.as_str(), error.row))
            .or_default()
            .push(text);
    }

    sheets
        .iter()
        .map(|sheet| {
            let table = find_table(sheet).filter(|_| !sheet.headers.is_empty());
            let kept: Vec<usize> = (0..sheet.headers.len())
                .filter(|&position| table.is_none() || sheet.headers[position] != ERROR_COLUMN)
                .collect();
            let cells_by_number: HashMap<u32, &Vec<String>> = sheet
                .rows
                .iter()
                .map(|row| (row.number, &row.cells))
                .collect();
            let last_row = sheet.rows.last().map_or(sheet.header_row, |row| row.number);

            let rows = (sheet.header_row + 1..=last_row)
                .map(|number| {
                    let cells = cells_by_number.get(&number);
                    let mut row: Vec<sheet::Value> = kept
                        .iter()
                        .map(|&position| {
                            let cell = cells
                                .and_then(|cells| cells.get(position))
                                .map_or("", String::as_str);
                            cell_value(table, &sheet.headers[position], cell)
                        })
                        .collect();
                    if table.is_some() {
                        row.push(
                            by_row
                                .get(&(sheet.name.as_str(), number))
                                .map_or(sheet::Value::Empty, |errors| {
                                    sheet::Value::Text(errors.join("; "))
                                }),
                        );
                    }
                    row
                })
                .collect();

            let mut headers: Vec<String> = kept
                .iter()
                .map(|&position| sheet.headers[position].clone())
                .collect();
            let mut text_columns = Vec::new();
            if let Some(table) = table {
                headers.push(ERROR_COLUMN.to_string());
                text_columns = [table.text_columns(), &[ERROR_COLUMN]].concat();
            }
            sheet::SheetData {
                name: sheet.name.clone(),
                header_row: sheet.header_row,
                first_column: sheet.first_column,
                headers,
                text_columns,
                rows,
            }
        })
        .collect()
}

/// Typed only in a table's non-text columns; otherwise text, so codes keep leading zeros and wrong
/// values stay as typed.
fn cell_value(table: Option<&(dyn ImportTable + Sync)>, header: &str, cell: &str) -> sheet::Value {
    if cell.is_empty() {
        return sheet::Value::Empty;
    }
    let typed = table
        .is_some_and(|table| table.has_column(header) && !table.text_columns().contains(&header));
    if typed {
        if cell.eq_ignore_ascii_case("true") {
            return sheet::Value::Bool(true);
        }
        if cell.eq_ignore_ascii_case("false") {
            return sheet::Value::Bool(false);
        }
        if let Ok(number) = cell.parse::<f64>()
            && number.is_finite()
        {
            return sheet::Value::Number(number);
        }
    }
    sheet::Value::Text(cell.to_string())
}

/// Tests that need no table. Kept out of `mod tests`, which the first table brings.
#[cfg(test)]
mod no_table_tests {
    use super::*;
    use sheet::{Sheet, SheetRow, Value};

    struct Stub;
    impl ImportTable for Stub {
        fn table(&self) -> CentralDataTable {
            unreachable!()
        }
        fn columns(&self) -> &'static [&'static str] {
            &["code", "name"]
        }
        fn text_columns(&self) -> &'static [&'static str] {
            &[]
        }
        fn export_only_columns(&self) -> &'static [&'static str] {
            &["created_date"]
        }
        fn export(
            &self,
            _: &StorageConnection,
            _: &ExportFilter,
        ) -> Result<Vec<Vec<Value>>, RepositoryError> {
            unreachable!()
        }
        fn count(
            &self,
            _: &StorageConnection,
            _: &ExportFilter,
        ) -> Result<RecordCount, RepositoryError> {
            unreachable!()
        }
        fn start_sheet(
            &self,
            _: &StorageConnection,
        ) -> Result<Box<dyn SheetImport>, RepositoryError> {
            unreachable!()
        }
    }

    /// Headings on row 2 from column C, as in a sheet with a title row and two blank columns.
    fn sheet(headers: &[&str], rows: &[(u32, &[&str])]) -> Sheet {
        Sheet {
            name: "notes".to_string(),
            header_row: 2,
            first_column: 3,
            headers: headers.iter().map(|header| header.to_string()).collect(),
            rows: rows
                .iter()
                .map(|(number, cells)| SheetRow {
                    number: *number,
                    cells: cells.iter().map(|cell| cell.to_string()).collect(),
                })
                .collect(),
        }
    }

    // covers: OMS-REG-CDIO-01.60

    #[test]
    fn unknown_repeated_and_unheaded_columns_are_errors_on_the_heading_row() {
        let sheet = sheet(
            &["code", "nmae", "", "code", "error"],
            &[(3, &["A", "x", "stray", "B", "old"])],
        );
        let errors: Vec<_> = check_headers(&Stub, &sheet)
            .into_iter()
            .map(|error| (error.row, error.column, error.message))
            .collect();
        assert_eq!(
            errors,
            [
                (
                    2,
                    Some("nmae".to_string()),
                    "Unknown column. The notes sheet can have: code, name, created_date"
                        .to_string()
                ),
                // Excel's letter: the sheet starts in column C.
                (2, None, "Column E has values but no heading".to_string()),
                (
                    2,
                    Some("code".to_string()),
                    "This column appears twice".to_string()
                ),
            ]
        );
    }

    #[test]
    fn errors_file_copies_a_sheet_that_is_not_a_table_as_it_is() {
        let notes = sheet(&["note", "error"], &[(3, &["a", "b"]), (5, &["c", ""])]);
        let copied = errors_file_sheets(&[notes], &[]).pop().unwrap();

        assert_eq!(copied.headers, ["note", "error"]);
        assert_eq!((copied.header_row, copied.first_column), (2, 3));
        // Rows 3 to 5, the blank row 4 included, so row numbers still match.
        let rows: Vec<Vec<&str>> = copied
            .rows
            .iter()
            .map(|row| {
                row.iter()
                    .map(|value| match value {
                        Value::Text(text) => text.as_str(),
                        Value::Empty => "",
                        _ => panic!("a non-table cell is copied as text"),
                    })
                    .collect()
            })
            .collect();
        assert_eq!(rows, [vec!["a", "b"], vec!["", ""], vec!["c", ""]]);
    }
}
