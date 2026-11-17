#[derive(Debug, Clone, PartialEq)]
pub struct RowError {
    pub sheet: String,
    /// As Excel shows it. `None` on a sheet name, which has no row.
    pub row: Option<u32>,
    pub column: Option<String>,
    pub message: String,
}

pub struct Row<'a> {
    pub sheet: &'a str,
    pub number: u32,
    pub headers: &'a [String],
    pub cells: &'a [String],
}

impl Row<'_> {
    /// `None` when the sheet has no such column. A blank cell is `Some("")`.
    pub fn cell(&self, column: &str) -> Option<&str> {
        let position = self.headers.iter().position(|header| header == column)?;
        Some(self.cells.get(position).map_or("", String::as_str))
    }

    pub fn has(&self, column: &str) -> bool {
        self.headers.iter().any(|header| header == column)
    }

    /// `None` when the column is missing or the cell is blank.
    pub fn text(&self, column: &str) -> Option<String> {
        self.cell(column)
            .filter(|cell| !cell.is_empty())
            .map(str::to_string)
    }

    pub fn bool(&self, column: &str) -> Result<Option<bool>, RowError> {
        match self.text(column) {
            None => Ok(None),
            Some(text) => parse_bool(&text).map(Some).ok_or_else(|| {
                self.error(column, format!("\"{text}\" must be TRUE, FALSE, 1 or 0"))
            }),
        }
    }

    pub fn int(&self, column: &str) -> Result<Option<i32>, RowError> {
        let Some(text) = self.text(column) else {
            return Ok(None);
        };
        // Excel numbers are floats: 3 can read as "3.0".
        match text.parse::<f64>() {
            Ok(number)
                if number.fract() == 0.0
                    && number >= i32::MIN as f64
                    && number <= i32::MAX as f64 =>
            {
                Ok(Some(number as i32))
            }
            _ => Err(self.error(column, format!("\"{text}\" must be a whole number"))),
        }
    }

    pub fn error(&self, column: &str, message: impl Into<String>) -> RowError {
        RowError {
            sheet: self.sheet.to_string(),
            row: Some(self.number),
            column: Some(column.to_string()),
            message: message.into(),
        }
    }
}

/// `TRUE` or `FALSE` in any letter case, or `1` or `0`.
pub fn parse_bool(text: &str) -> Option<bool> {
    match text {
        "1" => Some(true),
        "0" => Some(false),
        _ if text.eq_ignore_ascii_case("true") => Some(true),
        _ if text.eq_ignore_ascii_case("false") => Some(false),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with_row(cells: &[&str], test: impl FnOnce(Row)) {
        let headers: Vec<String> = ["text", "flag", "number"].map(String::from).to_vec();
        let cells: Vec<String> = cells.iter().map(|cell| cell.to_string()).collect();
        test(Row {
            sheet: "table",
            number: 7,
            headers: &headers,
            cells: &cells,
        });
    }

    #[test]
    fn missing_column_and_blank_cell_differ() {
        with_row(&["", "TRUE"], |row| {
            assert_eq!(row.cell("text"), Some(""));
            assert_eq!(row.text("text"), None);
            // A row shorter than the header reads as blank cells.
            assert_eq!(row.cell("number"), Some(""));
            assert_eq!(row.cell("missing"), None);
            assert!(!row.has("missing"));
        });
    }

    // covers: OMS-REG-CDIO-01.27

    #[test]
    fn bool_accepts_true_and_false_in_any_case_or_1_and_0() {
        for (cell, expected) in [
            ("TRUE", Some(true)),
            ("false", Some(false)),
            ("1", Some(true)),
            ("0", Some(false)),
            ("", None),
        ] {
            with_row(&["", cell], |row| {
                assert_eq!(row.bool("flag"), Ok(expected))
            });
        }
        for typo in ["yes", "2", "-1"] {
            with_row(&["", typo], |row| {
                let error = row.bool("flag").unwrap_err();
                assert_eq!(
                    (error.row, error.column.as_deref()),
                    (Some(7), Some("flag"))
                );
                assert_eq!(
                    error.message,
                    format!("\"{typo}\" must be TRUE, FALSE, 1 or 0")
                );
            });
        }
    }

    // covers: OMS-REG-CDIO-01.28

    #[test]
    fn int_accepts_excel_floats_of_whole_numbers() {
        for (cell, expected) in [
            ("3", Some(3)),
            ("3.0", Some(3)),
            ("-2", Some(-2)),
            ("", None),
        ] {
            with_row(&["", "", cell], |row| {
                assert_eq!(row.int("number"), Ok(expected))
            });
        }
        for cell in ["3.5", "abc", "1e12"] {
            with_row(&["", "", cell], |row| {
                assert!(row.int("number").is_err(), "{cell}")
            });
        }
    }
}
