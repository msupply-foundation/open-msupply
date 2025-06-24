use std::{collections::HashMap, fs, time::SystemTime};

use chrono::{DateTime, Utc};
use scraper::{ElementRef, Html, Selector};
use umya_spreadsheet::{
    helper::coordinate::{column_index_from_string, coordinate_from_index, index_from_coordinate},
    writer::xlsx,
    Cell, FontSize, Worksheet,
};

use crate::static_files::{StaticFileCategory, StaticFileService};

use super::report_service::{GeneratedReport, ReportError};

/// Converts the report to an Excel file and returns the file id
pub fn export_html_report_to_excel(
    base_dir: &Option<String>,
    report: GeneratedReport,
    report_name: String,
    template_as_buffer: &Option<Vec<u8>>,
) -> Result<String, ReportError> {
    let sheet_name = "Report";
    // Save the file to the tmp directory
    let now: DateTime<Utc> = SystemTime::now().into();
    let file_service = StaticFileService::new(base_dir)
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;

    let reserved_file = file_service
        .reserve_file(
            &format!("{}_{}.xlsx", now.format("%Y%m%d_%H%M%S"), report_name),
            &StaticFileCategory::Temporary,
            None,
        )
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;

    let mut book = match template_as_buffer {
        Some(template) => {
            // Save a copy of the template to the reserved file path
            fs::write(&reserved_file.path, template)
                .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;

            // Read the template as a mutable XLSX book
            umya_spreadsheet::reader::xlsx::read(&reserved_file.path)
                .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?
        }
        None => {
            // Create a new xlsx file if no template is provided
            let mut book = umya_spreadsheet::new_file();
            book.set_sheet_name(0, sheet_name)
                .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;
            book
        }
    };

    let sheet = book
        .get_sheet_by_name_mut(sheet_name)
        .ok_or(ReportError::DocGenerationError(format!(
            "Couldn't find Excel sheet: {}",
            sheet_name
        )))?;

    // Parse HTML report and apply it to the sheet
    apply_report(sheet, report);

    xlsx::write(&book, reserved_file.path)
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;

    Ok(reserved_file.id)
}

fn apply_report(sheet: &mut Worksheet, report: GeneratedReport) -> () {
    let mut row_idx: u32 = 1;

    // HEADER
    let header = Selectors::new(&report.header.unwrap_or_default());
    let header_cells = header.excel_cells();

    for (coordinate, el) in header_cells.into_iter() {
        let sheet_cell = sheet.get_cell_mut(coordinate);

        sheet_cell.set_value(inner_text(el));

        if let Some(cell_type) = el.attr("excel-type") {
            apply_known_styles(sheet_cell, cell_type);
        };

        let (_, row, _, _) = index_from_coordinate(coordinate);
        let row_index = row.unwrap_or(0);

        // Keep track of which rows are used by the header section, data rows should be after
        if row_idx < row_index {
            row_idx = row_index + 1;
        }
    }

    // IMPORTANT: Leave a row before the main data table
    // Needed to support pivot tables/post processing in Excel
    row_idx += 1;

    // MAIN DATA
    let body = Selectors::new(&report.document);
    let mut index_to_column_index_map: HashMap<u32, u32> = HashMap::new();

    // Header row
    let data_header_row = body.data_headers();

    let has_custom_columns = data_header_row
        .iter()
        .any(|(custom_column, _)| custom_column.is_some());

    for (index, (custom_column_coord, header)) in data_header_row.into_iter().enumerate() {
        if has_custom_columns && custom_column_coord.is_none() {
            // If there are custom columns, we skip the default ones
            continue;
        }
        let html_index = index as u32;

        let column_index = custom_column_coord
            .map(column_index_from_string)
            .unwrap_or(html_index + 1);

        // Store the mapping from HTML index to column index - used for data rows
        index_to_column_index_map.insert(html_index, column_index);

        let cell = sheet.get_cell_mut((column_index, row_idx));

        cell.set_value(header);
        cell.get_style_mut().get_font_mut().set_bold(true);
    }
    row_idx += 1; // Next row

    // Data rows
    for row in body.rows_and_cells().into_iter() {
        // Duplicate any formulae/formatting to the next row before populating
        for col in 0..sheet.get_highest_column() {
            let col = col + 1;

            if let Some(cell) = sheet.get_cell((col, row_idx)) {
                let mut cell = cell.clone();
                cell.set_coordinate(coordinate_from_index(&col, &(row_idx + 1)));
                sheet.set_cell(cell.clone());
            }
        }

        for (cell_index, cell) in row.into_iter().enumerate() {
            // If no custom columns, every column will be mapped, otherwise only custom columns
            if let Some(column_index) = index_to_column_index_map.get(&(cell_index as u32)).cloned()
            {
                sheet.get_cell_mut((column_index, row_idx)).set_value(cell);
            }
        }
        row_idx += 1; // Next row
    }

    // FOOTER
    // Currently not implemented, but could be added later
}

struct Selectors {
    html: Html,
}

impl Selectors {
    fn new(html_str: &str) -> Self {
        let formatted = format!(
            r#"
              <div>
                  {}
              </div>
            "#,
            html_str
        );

        let html = Html::parse_fragment(&formatted);

        Self { html }
    }

    fn excel_cells(&self) -> Vec<(&str, ElementRef)> {
        let cell_selector = Selector::parse("[excel-cell]").unwrap();
        self.html
            .select(&cell_selector)
            .map(|element| {
                let coordinate = element.attr("excel-cell").unwrap_or_default();
                (coordinate, element)
            })
            .collect()
    }

    fn data_headers(&self) -> Vec<(Option<&str>, &str)> {
        let headers_selector = Selector::parse("thead tr td,thead tr th").unwrap();
        self.html
            .select(&headers_selector)
            .map(|element| {
                let custom_column = element.attr("excel-column");
                let header_text = inner_text(element);

                (custom_column, header_text)
            })
            .collect()
    }

    fn rows_and_cells(&self) -> Vec<Vec<&str>> {
        let rows_selector = Selector::parse("tbody tr").unwrap();
        let cells_selector = Selector::parse("td").unwrap();
        self.html
            .select(&rows_selector)
            .map(|row| row.select(&cells_selector).map(inner_text).collect())
            .collect()
    }
}

fn inner_text(element_ref: ElementRef) -> &str {
    element_ref
        .text()
        .find(|t| !t.trim().is_empty())
        .map(|t| t.trim())
        .unwrap_or_default()
}

fn apply_known_styles(cell: &mut Cell, cell_type: &str) {
    let style = cell.get_style_mut();

    match cell_type {
        "title" => {
            let mut font_size = FontSize::default();
            font_size.set_val(14.0);
            style.get_font_mut().set_bold(true).set_font_size(font_size);
        }
        "bold" => {
            style.get_font_mut().set_bold(true);
        }
        _ => {
            // Unknown type, leave as is
        }
    }
}

#[cfg(test)]
mod report_to_excel_test {
    use super::*;
    use scraper::Html;

    #[test]
    fn test_generate_excel() {
        let report: GeneratedReport = GeneratedReport {
            document: r#"
               <table>
              <thead
                <tr>
                  <th excel-column="B">Item</th>
                  <th>Unit</th>
                  <th excel-column="C">Consumed</th>
                </tr>
              </thead>
              <tbody>
              <tr>
                <td>Acetylsalicylic Acid 100mg tabs</td>
                <td>Tablets</td>
                <td>3</td>
              </tr>
              <tr>
                <td>Ibuprofen 200mg tabs</td>
                <td>Tablets</td>
                <td>3</td>
              </tr>
              <tr>
                <td>Paracetamol 500mg tabs</td>
                <td>Tablets</td>
                <td>5</td>
              </tr>
            </tbody>
            </table>
</table>
        "#
            .to_string(),
            header: Some(
                r#"
                <div excel-cell="A2"></div>
            "#
                .to_string(),
            ),
            footer: None,
        };

        let mut book = umya_spreadsheet::new_file();
        book.set_sheet_name(0, "test").unwrap();

        let sheet = book.get_sheet_by_name_mut("test").unwrap();

        apply_report(sheet, report);

        let get_value = |coord: &str| {
            sheet
                .get_cell(coord)
                .map(|c| c.get_raw_value().to_string())
                .unwrap_or_default()
        };

        assert_eq!(get_value("B4"), "Item");
        assert_eq!(get_value("C4"), "Consumed");
        assert_eq!(get_value("A4"), "");
        assert_eq!(get_value("B6"), "Ibuprofen 200mg tabs");
    }

    #[test]
    fn test_inner_text() {
        let html = Html::parse_fragment(
            r#"
               <div> 
                  <span class="out-of-stock">Out of Stock</span>
               </div>
                <div> 
                  Some other text
               </div>
        "#,
        );

        let divs_selector = Selector::parse("div").unwrap();

        let mut divs = html.select(&divs_selector);
        let div_with_child = divs.next().unwrap();

        assert_eq!(inner_text(div_with_child), "Out of Stock");

        let div = divs.next().unwrap();

        assert_eq!(inner_text(div), "Some other text");
    }

    #[test]
    fn test_excel_attribute_selector() {
        let selectors = Selectors::new(
            r#"
          <span excel-cell="B2">First</span>
          <span>Second</span>
          <span excel-cell="A1">Third</span>
        "#,
        );

        let cells = selectors.excel_cells();
        assert_eq!(cells.len(), 2);

        let (first_cell_coord, first_cell) = cells[0];
        assert_eq!(first_cell_coord, "B2");
        assert_eq!(inner_text(first_cell), "First");

        let (second_cell_coord, second_cell) = cells[1];
        assert_eq!(second_cell_coord, "A1");
        assert_eq!(inner_text(second_cell), "Third");
    }
    #[test]
    fn test_body_selectors() {
        let html = r#"
                  <div class="container">
                     <table>
                        <thead>
                           <tr class="heading">
                              <td>First Header</td>
                              <td excel-column="A">Second Header</td>
                           </tr>
                        </thead>
                        <tbody>
                           <tr>
                              <td>Row One Cell One</td>
                              <td>Row One Cell Two</td>
                           </tr>
                           <tr>
                              <td>Row Two Cell One</td>
                              <td>Row Two Cell Two</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
    "#;

        let selectors = Selectors::new(html);

        assert_eq!(
            selectors.data_headers(),
            vec![(None, "First Header"), (Some("A"), "Second Header")]
        );

        assert_eq!(
            selectors.rows_and_cells(),
            vec![
                vec!["Row One Cell One", "Row One Cell Two"],
                vec!["Row Two Cell One", "Row Two Cell Two"]
            ]
        );
    }
}
