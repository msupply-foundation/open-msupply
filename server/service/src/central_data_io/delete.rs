use super::{
    cells::{Row, RowError},
    sheet::Value,
};

pub const DELETE_COLUMN: &str = "delete";

/// Anything but blank or `DELETE` is an error, so a typo can't pass as a delete.
pub fn is_delete(row: &Row) -> Result<bool, RowError> {
    match row.cell(DELETE_COLUMN).unwrap_or("") {
        "" => Ok(false),
        "DELETE" => Ok(true),
        other => Err(row.error(
            DELETE_COLUMN,
            format!("\"{other}\" is not valid. Type DELETE to delete this row, or leave it blank"),
        )),
    }
}

/// A `DELETE` row may repeat `saved` (as exported) but not change it. Columns not in `saved` and
/// blank cells aren't checked.
pub fn check_unchanged(row: &Row, saved: &[(&str, Value)]) -> Result<(), RowError> {
    let changed: Vec<&str> = saved
        .iter()
        .filter(|(column, value)| {
            let Some(cell) = row.cell(column).filter(|cell| !cell.is_empty()) else {
                return false;
            };
            match value {
                Value::Text(text) => cell != text,
                // Excel numbers are floats: 3 can read as "3.0".
                Value::Number(number) => cell.parse::<f64>().ok() != Some(*number),
                Value::Bool(flag) => !cell.eq_ignore_ascii_case(&flag.to_string()),
                Value::Empty => true,
            }
        })
        .map(|(column, _)| *column)
        .collect();
    if changed.is_empty() {
        return Ok(());
    }
    Err(row.error(
        DELETE_COLUMN,
        format!(
            "A row marked DELETE can't also change {}. Clear it or put back the saved value",
            changed.join(", ")
        ),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with_row(cells: &[&str], test: impl FnOnce(Row)) {
        let headers: Vec<String> = ["code", "name", "created_date", "delete"]
            .map(String::from)
            .to_vec();
        let cells: Vec<String> = cells.iter().map(|cell| cell.to_string()).collect();
        test(Row {
            sheet: "name",
            number: 4,
            headers: &headers,
            cells: &cells,
        });
    }

    #[test]
    fn blank_or_missing_keeps_the_row() {
        with_row(&["A", "", "", ""], |row| {
            assert_eq!(is_delete(&row), Ok(false))
        });
        let headers: Vec<String> = vec!["code".into()];
        let cells: Vec<String> = vec!["A".into()];
        let row = Row {
            sheet: "name",
            number: 4,
            headers: &headers,
            cells: &cells,
        };
        assert_eq!(is_delete(&row), Ok(false));
    }

    // covers: OMS-REG-CDIO-01.25

    #[test]
    fn only_exact_upper_case_delete_deletes() {
        with_row(&["A", "", "", "DELETE"], |row| {
            assert_eq!(is_delete(&row), Ok(true))
        });
        for typo in ["delete", "Delete", "X", "yes"] {
            with_row(&["A", "", "", typo], |row| {
                let error = is_delete(&row).unwrap_err();
                assert_eq!(error.column.as_deref(), Some("delete"));
                assert_eq!(
                    error.message,
                    format!(
                        "\"{typo}\" is not valid. Type DELETE to delete this row, or leave it blank"
                    )
                );
            });
        }
    }

    // covers: OMS-REG-CDIO-01.26, .55

    #[test]
    fn delete_row_may_keep_saved_values_but_not_change_them() {
        let saved = || {
            [
                ("code", Value::Text("A".into())),
                ("name", Value::Text("Clinic".into())),
            ]
        };
        // Blank, or as exported, export-only columns aside.
        for cells in [
            ["A", "", "", "DELETE"],
            ["A", "Clinic", "2026-01-01", "DELETE"],
        ] {
            with_row(&cells, |row| {
                assert_eq!(check_unchanged(&row, &saved()), Ok(()))
            });
        }
        with_row(&["A", "Hospital", "", "DELETE"], |row| {
            let error = check_unchanged(&row, &saved()).unwrap_err();
            assert_eq!(error.column.as_deref(), Some("delete"));
            assert_eq!(
                error.message,
                "A row marked DELETE can't also change name. Clear it or put back the saved value"
            );
        });
    }

    #[test]
    fn numbers_and_flags_compare_by_value() {
        let headers: Vec<String> = ["index", "is_active", "description"]
            .map(String::from)
            .to_vec();
        let saved = [
            ("index", Value::Number(3.0)),
            ("is_active", Value::Bool(true)),
            ("description", Value::Empty),
        ];
        let check = |cells: [&str; 3]| {
            let cells: Vec<String> = cells.map(String::from).to_vec();
            let row = Row {
                sheet: "name",
                number: 4,
                headers: &headers,
                cells: &cells,
            };
            check_unchanged(&row, &saved).map_err(|error| error.message)
        };
        assert_eq!(check(["3.0", "true", ""]), Ok(()));
        assert!(check(["4", "TRUE", ""]).unwrap_err().contains("index"));
        assert!(check(["3", "FALSE", ""]).unwrap_err().contains("is_active"));
        assert!(
            check(["3", "TRUE", "new"])
                .unwrap_err()
                .contains("description")
        );
    }
}
