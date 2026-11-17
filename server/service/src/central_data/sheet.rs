use calamine::{DataRef, Reader, Xlsx, XlsxError, open_workbook};
use repository::trim_spaces;
use std::{
    fs::File,
    io::{BufReader, Cursor},
    path::Path,
};
use umya_spreadsheet::{NumberingFormat, Style};

pub struct Sheet {
    pub name: String,
    pub header_row: u32,
    /// Where `headers` and each row's `cells` start, as Excel numbers columns (A is 1).
    pub first_column: u32,
    /// Trimmed, lower case.
    pub headers: Vec<String>,
    /// Blank rows skipped.
    pub rows: Vec<SheetRow>,
}

pub struct SheetRow {
    /// As Excel shows it.
    pub number: u32,
    /// Trimmed, in header order.
    pub cells: Vec<String>,
}

/// shortcut: room for about 50 columns at the row cap. A loaded sheet holds every cell between
/// its first and last used ones, so one value typed far from the data would otherwise fill memory.
pub const MAX_CELLS: usize = 5_000_000;

pub enum ReadError {
    Unreadable(String),
    TooManyRows(usize),
    TooManyCells(usize),
}

impl From<XlsxError> for ReadError {
    fn from(error: XlsxError) -> Self {
        ReadError::Unreadable(error.to_string())
    }
}

/// Measures the sheets before loading any, since a loaded sheet holds its whole grid.
pub fn read(path: &Path, max_rows: usize) -> Result<Vec<Sheet>, ReadError> {
    let mut workbook: Xlsx<BufReader<File>> = open_workbook(path)?;
    let size = measure(&mut workbook)?;
    if size.rows > max_rows {
        return Err(ReadError::TooManyRows(size.rows));
    }
    if size.cells > MAX_CELLS {
        return Err(ReadError::TooManyCells(size.cells));
    }
    workbook
        .sheet_names()
        .into_iter()
        .map(|name| -> Result<Sheet, ReadError> {
            let range = workbook.worksheet_range(&name)?;
            // The range starts at the first used cell: the header row.
            let (header_row, first_column) = range
                .start()
                .map_or((1, 1), |(row, column)| (row + 1, column + 1));
            // Only spaces are trimmed, as SQL trims a saved key: a code saved as "PARA\t" must
            // read back as itself to be found.
            let mut rows = range.rows().map(|cells| {
                cells
                    .iter()
                    .map(|cell| trim_spaces(&cell.to_string()).to_string())
                    .collect::<Vec<_>>()
            });
            let headers = rows
                .next()
                .unwrap_or_default()
                .into_iter()
                .map(|header| header.to_lowercase())
                .collect();
            let rows = rows
                .zip(header_row + 1..)
                .filter(|(cells, _)| cells.iter().any(|cell| !cell.is_empty()))
                .map(|(cells, number)| SheetRow { number, cells })
                .collect();
            Ok(Sheet {
                name,
                header_row,
                first_column,
                headers,
                rows,
            })
        })
        .collect()
}

struct Size {
    /// Non-blank rows below the headers.
    rows: usize,
    /// Cells the loaded sheets will hold.
    cells: usize,
}

/// Streamed, so nothing is loaded. Skips empty cells, as `worksheet_range` does.
fn measure(workbook: &mut Xlsx<BufReader<File>>) -> Result<Size, XlsxError> {
    let mut size = Size { rows: 0, cells: 0 };
    for name in workbook.sheet_names() {
        let mut cells = workbook.worksheet_cells_reader(&name)?;
        let mut header_row = None;
        let mut last_counted = None;
        let (mut last_row, mut first_column, mut last_column) = (0, u32::MAX, 0);
        while let Some(cell) = cells.next_cell()? {
            let (row, column) = cell.get_position();
            let blank = match cell.get_value() {
                DataRef::Empty => continue,
                DataRef::String(text) => trim_spaces(text).is_empty(),
                DataRef::SharedString(text) => trim_spaces(text).is_empty(),
                _ => false,
            };
            let header = *header_row.get_or_insert(row);
            last_row = last_row.max(row);
            first_column = first_column.min(column);
            last_column = last_column.max(column);
            if row != header && !blank && last_counted != Some(row) {
                size.rows += 1;
                last_counted = Some(row);
            }
        }
        if let Some(header) = header_row {
            size.cells +=
                (last_row - header + 1) as usize * (last_column - first_column + 1) as usize;
        }
    }
    Ok(size)
}

pub enum Value {
    Text(String),
    Number(f64),
    Bool(bool),
    Empty,
}

impl Value {
    /// As a preview shows the cell.
    pub fn display(&self) -> String {
        match self {
            Value::Text(text) => text.clone(),
            Value::Number(number) => number.to_string(),
            Value::Bool(flag) => flag.to_string().to_uppercase(),
            Value::Empty => String::new(),
        }
    }
}

impl From<String> for Value {
    fn from(value: String) -> Self {
        Value::Text(value)
    }
}

impl From<Option<String>> for Value {
    fn from(value: Option<String>) -> Self {
        value.map_or(Value::Empty, Value::Text)
    }
}

impl From<i32> for Value {
    fn from(value: i32) -> Self {
        Value::Number(value.into())
    }
}

impl From<bool> for Value {
    fn from(value: bool) -> Self {
        Value::Bool(value)
    }
}

pub struct SheetData {
    pub name: String,
    /// Rows follow it, one per row number.
    pub header_row: u32,
    /// Where headers and rows start, as Excel numbers columns (A is 1).
    pub first_column: u32,
    pub headers: Vec<String>,
    /// Formatted as Text, column and cells.
    pub text_columns: Vec<&'static str>,
    pub rows: Vec<Vec<Value>>,
}

pub fn write(sheets: Vec<SheetData>) -> Result<Vec<u8>, String> {
    let mut book = umya_spreadsheet::new_file();
    for (index, sheet_data) in sheets.into_iter().enumerate() {
        let sheet = if index == 0 {
            book.set_sheet_name(0, sheet_data.name.as_str())
                .map_err(|e| e.to_string())?;
            book.get_sheet_mut(&0)
        } else {
            book.new_sheet(sheet_data.name.as_str())
                .map_err(|e| e.to_string())?;
            book.get_sheet_mut(&index)
        }
        .ok_or("Failed to create worksheet")?;

        let is_text: Vec<bool> = sheet_data
            .headers
            .iter()
            .map(|header| sheet_data.text_columns.contains(&header.as_str()))
            .collect();
        for (column, header) in sheet_data.headers.iter().enumerate() {
            let cell = sheet.get_cell_mut((
                column as u32 + sheet_data.first_column,
                sheet_data.header_row,
            ));
            cell.set_value_string(header);
            cell.get_style_mut().get_font_mut().set_bold(true);
            // A General cell drops a typed number's leading zeros, so the whole column is Text.
            if is_text[column] {
                set_text_format(
                    sheet
                        .get_column_dimension_by_number_mut(
                            &(column as u32 + sheet_data.first_column),
                        )
                        .get_style_mut(),
                );
            }
        }
        for (row, values) in sheet_data.rows.into_iter().enumerate() {
            for (column, value) in values.into_iter().enumerate() {
                let cell = sheet.get_cell_mut((
                    column as u32 + sheet_data.first_column,
                    sheet_data.header_row + 1 + row as u32,
                ));
                if is_text.get(column) == Some(&true) {
                    set_text_format(cell.get_style_mut());
                }
                match value {
                    Value::Text(text) => cell.set_value_string(text),
                    Value::Number(number) => cell.set_value_number(number),
                    Value::Bool(boolean) => cell.set_value_bool(boolean),
                    Value::Empty => continue,
                };
            }
        }
    }

    let mut bytes = Cursor::new(Vec::new());
    umya_spreadsheet::writer::xlsx::write_writer(&book, &mut bytes).map_err(|e| e.to_string())?;
    Ok(bytes.into_inner())
}

fn set_text_format(style: &mut Style) {
    style
        .get_number_format_mut()
        .set_format_code(NumberingFormat::FORMAT_TEXT);
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // covers: OMS-REG-CDIO-01.7, .72

    #[test]
    fn too_many_rows_is_refused_with_the_count_and_blank_rows_do_not_count() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("rows.xlsx");
        let rows = vec![
            vec!["a".to_string().into()],
            vec!["   ".to_string().into()],
            vec![Value::Empty, 2.into()],
            vec![true.into()],
        ];
        let bytes = write(vec![SheetData {
            name: "table".to_string(),
            header_row: 1,
            first_column: 1,
            headers: vec!["name".to_string(), "index".to_string()],
            text_columns: vec![],
            rows,
        }])
        .unwrap();
        std::fs::write(&path, bytes).unwrap();

        assert!(matches!(read(&path, 2), Err(ReadError::TooManyRows(3))));
        let sheets = read(&path, 3).ok().unwrap();
        assert_eq!(sheets[0].rows.len(), 3);
    }

    // covers: OMS-REG-CDIO-01.64

    #[test]
    fn data_away_from_a1_keeps_excels_row_and_column_numbers() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("offset.xlsx");
        let mut book = umya_spreadsheet::new_file();
        let sheet = book.get_sheet_mut(&0).unwrap();
        sheet.get_cell_mut((3, 3)).set_value_string("Name");
        sheet.get_cell_mut((4, 3)).set_value_string("Code");
        sheet.get_cell_mut((3, 4)).set_value_string("a");
        sheet.get_cell_mut((4, 6)).set_value_string("b");
        umya_spreadsheet::writer::xlsx::write(&book, &path).unwrap();

        let mut workbook: Xlsx<BufReader<File>> = open_workbook(&path).unwrap();
        let size = measure(&mut workbook).unwrap();
        // Rows 3 to 6 by columns C and D, as `worksheet_range` loads them.
        assert_eq!((size.rows, size.cells), (2, 8));

        let sheet = read(&path, 10).ok().unwrap().pop().unwrap();
        assert_eq!((sheet.header_row, sheet.first_column), (3, 3));
        assert_eq!(sheet.headers, ["name", "code"]);
        let rows: Vec<_> = sheet
            .rows
            .iter()
            .map(|row| (row.number, &row.cells[..]))
            .collect();
        assert_eq!(
            rows,
            [
                (4, &["a".to_string(), String::new()][..]),
                (6, &[String::new(), "b".to_string()][..])
            ]
        );
    }

    #[test]
    fn a_value_far_from_the_data_is_refused_before_loading() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("stray.xlsx");
        let mut book = umya_spreadsheet::new_file();
        let sheet = book.get_sheet_mut(&0).unwrap();
        sheet.get_cell_mut((1, 1)).set_value_string("name");
        sheet.get_cell_mut((3000, 2000)).set_value_string("stray");
        umya_spreadsheet::writer::xlsx::write(&book, &path).unwrap();

        assert!(matches!(
            read(&path, 10),
            Err(ReadError::TooManyCells(6_000_000))
        ));
    }

    // covers: OMS-REG-CDIO-01.22

    #[test]
    fn text_columns_and_their_cells_are_formatted_as_text() {
        let bytes = write(vec![SheetData {
            name: "table".to_string(),
            header_row: 1,
            first_column: 1,
            headers: vec!["name".to_string(), "index".to_string()],
            text_columns: vec!["name"],
            rows: vec![vec!["007".to_string().into(), 3.into()]],
        }])
        .unwrap();
        let book = umya_spreadsheet::reader::xlsx::read_reader(Cursor::new(bytes), true).unwrap();
        let sheet = book.get_sheet(&0).unwrap();
        let format = |style: &Style| {
            style
                .get_number_format()
                .map(|format| format.get_format_code().to_string())
        };

        let name_column = sheet.get_column_dimension_by_number(&1).unwrap();
        assert_eq!(format(name_column.get_style()).as_deref(), Some("@"));
        assert_eq!(format(sheet.get_style((1, 2))).as_deref(), Some("@"));
        let index_column = sheet.get_column_dimension_by_number(&2);
        assert_ne!(
            index_column
                .and_then(|column| format(column.get_style()))
                .as_deref(),
            Some("@")
        );
        assert_ne!(format(sheet.get_style((2, 2))).as_deref(), Some("@"));
    }
}
