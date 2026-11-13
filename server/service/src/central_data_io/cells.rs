use super::sheet::Value;

#[derive(Debug, Clone, PartialEq)]
pub struct RowError {
    pub sheet: String,
    /// As Excel shows it.
    pub row: u32,
    pub column: Option<String>,
    pub message: String,
}

/// Cells are read trimmed: keep a saved value whose cell differs only by its spaces.
pub fn keep_padded(cell: Option<String>, saved: Option<&str>) -> Option<String> {
    match saved {
        Some(saved) if saved.trim() == cell.as_deref().unwrap_or("") => Some(saved.to_string()),
        _ => cell,
    }
}

/// As `keep_padded`, but a blank cell keeps the saved value too.
pub fn keep_or_saved(cell: Option<String>, saved: Option<&str>) -> Option<String> {
    keep_padded(cell, saved).or(saved.map(str::to_string))
}

/// A choice column's cell for `value`, as `Row::choice` reads it back.
pub fn choice_cell<T: PartialEq>(choices: &[(&'static str, T)], value: &T) -> Value {
    choices
        .iter()
        .find(|(_, choice)| choice == value)
        .map_or(Value::Empty, |(label, _)| Value::Text(label.to_string()))
}

/// The value, or its default with the error added to `errors`.
pub fn collect<T: Default>(errors: &mut Vec<RowError>, result: Result<T, RowError>) -> T {
    result.unwrap_or_else(|error| {
        errors.push(error);
        T::default()
    })
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

    /// An optional text column: a blank cell clears it, a missing column keeps `saved`.
    pub fn optional_text(&self, column: &str, saved: Option<&str>) -> Option<String> {
        if self.has(column) {
            keep_padded(self.text(column), saved)
        } else {
            saved.map(str::to_string)
        }
    }

    /// An optional column's value: a blank cell gives the default, a missing column keeps `saved`.
    pub fn optional<T: Default>(&self, column: &str, cell: Option<T>, saved: Option<T>) -> T {
        if self.has(column) {
            cell.unwrap_or_default()
        } else {
            saved.unwrap_or_default()
        }
    }

    pub fn bool(&self, column: &str) -> Result<Option<bool>, RowError> {
        match self.text(column) {
            None => Ok(None),
            Some(text) if text.eq_ignore_ascii_case("true") => Ok(Some(true)),
            Some(text) if text.eq_ignore_ascii_case("false") => Ok(Some(false)),
            Some(text) => Err(self.error(column, format!("\"{text}\" must be TRUE or FALSE"))),
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

    pub fn number(&self, column: &str) -> Result<Option<f64>, RowError> {
        let Some(text) = self.text(column) else {
            return Ok(None);
        };
        match text.parse::<f64>() {
            Ok(number) if number.is_finite() => Ok(Some(number)),
            _ => Err(self.error(column, format!("\"{text}\" must be a number"))),
        }
    }

    /// One of `choices`, written as listed and read in any letter case.
    pub fn choice<T: Clone>(
        &self,
        column: &str,
        choices: &[(&str, T)],
    ) -> Result<Option<T>, RowError> {
        let Some(text) = self.text(column) else {
            return Ok(None);
        };
        match choices
            .iter()
            .find(|(choice, _)| choice.eq_ignore_ascii_case(&text))
        {
            Some((_, value)) => Ok(Some(value.clone())),
            None => {
                let listed: Vec<&str> = choices.iter().map(|(choice, _)| *choice).collect();
                Err(self.error(
                    column,
                    format!("\"{text}\" must be one of {}", listed.join(", ")),
                ))
            }
        }
    }

    /// Adds an error for each missing column that has none yet.
    pub fn require_for_new(
        &self,
        errors: &mut Vec<RowError>,
        record: &str,
        columns: &[(&str, bool)],
    ) {
        for (column, missing) in columns {
            if *missing && !errors.iter().any(|e| e.column.as_deref() == Some(column)) {
                errors.push(self.error(column, format!("{column} is required for a new {record}")));
            }
        }
    }

    pub fn error(&self, column: &str, message: impl Into<String>) -> RowError {
        RowError {
            sheet: self.sheet.to_string(),
            row: self.number,
            column: Some(column.to_string()),
            message: message.into(),
        }
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
    fn bool_accepts_true_and_false_in_any_case() {
        for (cell, expected) in [("TRUE", Some(true)), ("false", Some(false)), ("", None)] {
            with_row(&["", cell], |row| {
                assert_eq!(row.bool("flag"), Ok(expected))
            });
        }
        with_row(&["", "yes"], |row| {
            let error = row.bool("flag").unwrap_err();
            assert_eq!((error.row, error.column.as_deref()), (7, Some("flag")));
            assert_eq!(error.message, "\"yes\" must be TRUE or FALSE");
        });
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

    // covers: OMS-REG-CDIO-01.37

    #[test]
    fn choice_accepts_any_letter_case_and_lists_the_choices() {
        let choices = [("STOCK", 1), ("NON_STOCK", 2)];
        for (cell, expected) in [("non_stock", Some(2)), ("STOCK", Some(1)), ("", None)] {
            with_row(&[cell], |row| {
                assert_eq!(row.choice("text", &choices), Ok(expected))
            });
        }
        with_row(&["drug"], |row| {
            let error = row.choice("text", &choices).unwrap_err();
            assert_eq!(error.message, "\"drug\" must be one of STOCK, NON_STOCK");
        });
    }

    // covers: OMS-REG-CDIO-01.72

    #[test]
    fn number_accepts_decimals_and_refuses_text() {
        for (cell, expected) in [("-18.5", Some(-18.5)), ("4", Some(4.0)), ("", None)] {
            with_row(&["", "", cell], |row| {
                assert_eq!(row.number("number"), Ok(expected))
            });
        }
        for cell in ["abc", "inf", "NaN"] {
            with_row(&["", "", cell], |row| {
                let error = row.number("number").unwrap_err();
                assert_eq!(error.message, format!("\"{cell}\" must be a number"));
            });
        }
    }
}
