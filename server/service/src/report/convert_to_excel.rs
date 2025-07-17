use std::{collections::HashMap, fs, time::SystemTime};

use chrono::{DateTime, Utc};
use scraper::{ElementRef, Html, Selector};
use umya_spreadsheet::{
    helper::coordinate::{column_index_from_string, coordinate_from_index, index_from_coordinate},
    writer::xlsx,
    Cell, FontSize, Spreadsheet, Worksheet,
};

use crate::static_files::{StaticFile, StaticFileCategory, StaticFileService};

use super::report_service::{GeneratedReport, ReportError};

/// Converts the report to an Excel file and returns the file id
pub fn export_html_report_to_excel(
    base_dir: &Option<String>,
    report: GeneratedReport,
    report_name: String,
    template_as_buffer: &Option<Vec<u8>>,
) -> Result<String, ReportError> {
    let reserved_file = reserve_file(base_dir, &report_name)?;
    let mut book = get_workbook(template_as_buffer, &reserved_file.path)?;

    // We work with the first sheet in the book
    let sheet = book
        .get_sheet_mut(&0)
        .ok_or(ReportError::DocGenerationError(
            "Couldn't find Excel sheet".to_string(),
        ))?;

    // Parse HTML report and apply it to the sheet
    apply_report(sheet, report);

    // Save the report to tmp dir, for download
    xlsx::write(&book, reserved_file.path)
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;

    Ok(reserved_file.id)
}

/// Hold a file in the temporary directory
fn reserve_file(base_dir: &Option<String>, report_name: &str) -> Result<StaticFile, ReportError> {
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

    Ok(reserved_file)
}

/// Generates excel spreadsheet from a template or creates a new one
fn get_workbook(
    template_as_buffer: &Option<Vec<u8>>,
    path: &str,
) -> Result<Spreadsheet, ReportError> {
    let book = match template_as_buffer {
        Some(template) => {
            // Save a copy of the template to the reserved file path
            fs::write(path, template)
                .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;

            // Read in the template as a mutable XLSX book
            umya_spreadsheet::reader::xlsx::read(path)
                .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?
        }
        None => {
            // Create a new xlsx file if no template is provided
            let mut book = umya_spreadsheet::new_file();
            book.set_sheet_name(0, "Report")
                .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;
            book
        }
    };
    Ok(book)
}

/// Maps a generated HTML report to an Excel worksheet
fn apply_report(sheet: &mut Worksheet, report: GeneratedReport) -> () {
    let mut row_idx: u32 = 1;

    // HEADER
    let header_rows_used = report.header.as_ref().map_or(0, |h| {
        // If header is present, apply it and return the number of rows used
        apply_header(sheet, h)
    });

    // MAIN DATA
    let body = Selectors::new(&report.document);

    if let Some(start_row) = body.table_start_row() {
        // If the table start row is specified, use it
        row_idx = start_row;
    } else {
        // Otherwise, we start after the header rows
        if header_rows_used > 0 {
            // IMPORTANT: add a row before the main data table
            // needed to support pivot tables/post processing in Excel
            row_idx += header_rows_used + 1;
        }
    }

    // Table headers
    let index_to_column_map = apply_data_table_headers(&body, sheet, row_idx);
    // Data rows
    // remove _ when idx needed for footer
    let _row_idx = apply_data_rows(&body, sheet, row_idx + 1, &index_to_column_map);

    // FOOTER
    // Currently not implemented, but could be added later
}

/// Applies the header HTML to the worksheet
fn apply_header(sheet: &mut Worksheet, header_html: &str) -> u32 /* rows used */ {
    let header_selectors = Selectors::new(header_html);
    let header_cells = header_selectors.excel_cells();

    let mut used_rows: u32 = 0; // Start from the first row

    // Apply any header content to the specified coordinates
    for (coordinate, el) in header_cells.into_iter() {
        let sheet_cell = sheet.get_cell_mut(coordinate);

        sheet_cell.set_value(inner_text(el));

        if let Some(cell_type) = el.attr("excel-type") {
            apply_known_styles(sheet_cell, cell_type);
        };

        let (_, row, _, _) = index_from_coordinate(coordinate);
        let row_index = row.unwrap_or(0);

        if used_rows < row_index {
            used_rows = row_index;
        }
    }
    used_rows
}

/// Applies the data table header row to the worksheet
fn apply_data_table_headers(
    body: &Selectors,
    sheet: &mut Worksheet,
    row_idx: u32,
) -> HashMap<u32, u32> {
    let mut index_to_column_map = HashMap::new();

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
        index_to_column_map.insert(html_index, column_index);

        let cell = sheet.get_cell_mut((column_index, row_idx));

        cell.set_value(header);
        cell.get_style_mut().get_font_mut().set_bold(true);
    }

    index_to_column_map
}

/// Maps each row of data to the worksheet
fn apply_data_rows(
    body: &Selectors,
    sheet: &mut Worksheet,
    row_index: u32,
    index_to_column_index_map: &HashMap<u32, u32>,
) -> u32 {
    let mut row_idx = row_index;
    let body_rows = body.rows_and_cells();
    let rows_len = body_rows.len() as u32;

    // Insert new rows below (leave any footer from the excel template in place)
    sheet.insert_new_row(&(row_idx + 1), &rows_len);

    for row in body_rows.into_iter() {
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
    // Add a blank row before the total row
    row_idx += 1;

    // Total row
    for (cell_index, cell) in body.total_row().into_iter().enumerate() {
        if let Some(column_index) = index_to_column_index_map.get(&(cell_index as u32)).cloned() {
            let sheet_cell = sheet.get_cell_mut((column_index, row_idx));
            sheet_cell.set_value(cell);
            sheet_cell.get_style_mut().get_font_mut().set_bold(true);
        }
    }

    row_idx
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

    fn table_start_row(&self) -> Option<u32> {
        let cell_selector = Selector::parse("[excel-table-start-row]").unwrap();
        self.html.select(&cell_selector).next().map(|element| {
            element
                .attr("excel-table-start-row")
                .and_then(|val| val.parse::<u32>().ok())
        })?
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
        let rows_selector = Selector::parse("tbody tr:not([excel-type=\"total-row\"])").unwrap();
        let cells_selector = Selector::parse("td").unwrap();
        self.html
            .select(&rows_selector)
            .map(|row| row.select(&cells_selector).map(inner_text).collect())
            .collect()
    }

    fn total_row(&self) -> Vec<&str> {
        let rows_selector = Selector::parse("tbody tr[excel-type=\"total-row\"] td").unwrap();
        self.html.select(&rows_selector).map(inner_text).collect()
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
    use std::time::Duration;

    use super::*;
    use scraper::Html;

    #[test]
    fn test_generate_excel_no_attributes() {
        let report: GeneratedReport = GeneratedReport {
            document: r#"
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Unit</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Acetylsalicylic Acid 100mg tabs</td>
                <td>Tablets</td>
                <td>10.00</td>
              </tr>
              <tr>
                <td>Ibuprofen 200mg tabs</td>
                <td>Tablets</td>
                <td>15.00</td>
              </tr>
              <tr excel-type="total-row">
                <td></td>
                <td>Total:</td>
                <td>25.00</td>
              </tr>
            </tbody>
          </table>
        "#
            .to_string(),
            header: Some(
                r#"
                <div>Something here but with no excel-cell attribute</div>
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

        // Header is ignored, data table headers are in the first row
        assert_eq!(get_value("A1"), "Item");
        // all headers are in the first row, in order
        assert_eq!(get_value("B1"), "Unit");
        assert_eq!(get_value("C1"), "Price");
        // Data rows start from the second row
        assert_eq!(get_value("A2"), "Acetylsalicylic Acid 100mg tabs");
        assert_eq!(get_value("A3"), "Ibuprofen 200mg tabs");
        // Blank row before the total row
        assert_eq!(get_value("B4"), "");
        assert_eq!(get_value("B5"), "Total:");
    }

    #[test]
    fn test_generate_excel_with_attributes() {
        let report: GeneratedReport = GeneratedReport {
            document: r#"
          <table>
            <thead>
              <tr>
                <th excel-column="C">Item</th>
                <th>Unit</th>
                <th excel-column="B">Consumed</th>
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
        "#
            .to_string(),
            header: Some(
                r#"
                <div excel-cell="A2">Title Here</div>
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

        // Custom header cells are populated
        assert_eq!(get_value("A2"), "Title Here");

        // Header takes 2 rows, plus one empty row before the data table
        assert_eq!(get_value("B3"), "");
        // Data table headers start from row 4, using custom specified columns
        assert_eq!(get_value("A4"), "");
        assert_eq!(get_value("B4"), "Consumed");
        assert_eq!(get_value("C4"), "Item");
        // Data also mapped to the right columns
        assert_eq!(get_value("C6"), "Ibuprofen 200mg tabs");
        assert_eq!(get_value("A6"), "");
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
            // Some() where custom column is specified
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

    #[tokio::test]
    async fn test_generate_excel_perf() {
        // We want to ensure that excel export takes a sensible amount of time.
        // Many reports may have several thousand rows with dozens of columns

        const NUM_COLUMNS: u32 = 12;
        const NUM_ROWS: u32 = 10000;

        let mut headers = String::new();
        for i in 1..=NUM_COLUMNS {
            headers += &format!("<th>colHeader{}</th>\n", i);
        }

        let mut rows = String::new();
        for row_num in 1..=NUM_ROWS {
            rows += "<tr>\n";
            for col_num in 1..=NUM_COLUMNS {
                rows += &format!("<td>{row_num}.{col_num}</td>\n");
            }
            rows += "</tr>\n";
        }

        let document = format!(
            r#"<table>
<thead>
    <tr>
        {headers}
    </tr>
</thead>
<tbody>
    {rows}
</tbody>
</table>"#
        );

        let report: GeneratedReport = GeneratedReport {
            document,
            header: Some(
                r#"
                <div>Something here but with no excel-cell attribute</div>
            "#
                .to_string(),
            ),
            footer: None,
        };

        let mut book = umya_spreadsheet::new_file();
        book.set_sheet_name(0, "test").unwrap();

        let handle = tokio::spawn(async move {
            let sheet = book.get_sheet_by_name_mut("test").unwrap();
            let start = std::time::Instant::now();
            apply_report(sheet, report);
            let duration_millisec = start.elapsed().as_millis();
            dbg!(&duration_millisec);
            duration_millisec
        });

        let duration_millisec = tokio::time::timeout(Duration::from_secs(10), handle)
            .await
            .unwrap()
            .unwrap();

        // Note: this was tested on a M3 Macbook Pro and took around 1.6s. If your testing environment
        // is significantly slower it may fail this assertion! Just make it bigger... for lack of an
        // elegant way of scaling based on hardware info ;)
        assert!(
            duration_millisec < 5000,
            "Generate to excel should be FAST. Took: {}ms",
            duration_millisec
        );
    }

    #[test]
    fn test_generate_excel_with_template() {
        // Create a template Excel file with header and footer
        let mut template_book = umya_spreadsheet::new_file();
        template_book.set_sheet_name(0, "Report Template").unwrap();
        let template_sheet = template_book
            .get_sheet_by_name_mut("Report Template")
            .unwrap();

        // Add template header content
        template_sheet
            .get_cell_mut("A1")
            .set_value("Company Report")
            .get_style_mut()
            .get_font_mut()
            .set_bold(true);

        template_sheet
            .get_cell_mut("A2")
            .set_value("Generated on: [Date]");

        // Add template footer content (assume data ends around row 20, footer starts at row 22)
        template_sheet
            .get_cell_mut("A10")
            .set_value("End of Report")
            .get_style_mut()
            .get_font_mut()
            .set_bold(true);

        template_sheet
            .get_cell_mut("A11")
            .set_value("Company Footer Info");

        // Convert template to bytes (simulate how it would come from file storage)
        let temp_path = "/tmp/test_template.xlsx";
        umya_spreadsheet::writer::xlsx::write(&template_book, temp_path).unwrap();
        let template_bytes = std::fs::read(temp_path).unwrap();

        // Create HTML report with 10 rows of data
        let mut data_rows = String::new();
        for i in 1..=10 {
            data_rows += &format!(
                r#"<tr>
                    <td>Item {}</td>
                    <td>Unit {}</td>
                    <td>{}.00</td>
                </tr>"#,
                i,
                i,
                i * 10
            );
        }

        let report = GeneratedReport {
            document: format!(
                r#"<table excel-table-start-row="5">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Unit</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {}
                        <tr excel-type="total-row">
                            <td></td>
                            <td>Total:</td>
                            <td>550.00</td>
                        </tr>
                    </tbody>
                </table>"#,
                data_rows
            ),
            header: Some(r#"<div excel-cell="C2">Report Date: 2025-07-17</div>"#.to_string()),
            footer: None,
        };

        // Test the full export function with template
        let result = export_html_report_to_excel(
            &None, // base_dir
            report,
            "test_with_template".to_string(),
            &Some(template_bytes),
        );

        assert!(result.is_ok(), "Export should succeed with template");
        let file_id = result.unwrap();

        // Read back the generated file to verify content
        let file_service = StaticFileService::new(&None).unwrap();
        let generated_file = file_service
            .find_file(&file_id, StaticFileCategory::Temporary)
            .unwrap()
            .unwrap();
        let generated_book = umya_spreadsheet::reader::xlsx::read(&generated_file.path).unwrap();
        let sheet = generated_book.get_sheet(&0).unwrap();

        let get_value = |coord: &str| {
            sheet
                .get_cell(coord)
                .map(|c| c.get_raw_value().to_string())
                .unwrap_or_default()
        };

        let is_bold = |coord: &str| {
            sheet
                .get_cell(coord)
                .and_then(|c| c.get_style().get_font())
                .map(|f| *f.get_bold())
                .unwrap_or(false)
        };

        // Verify original template header is preserved
        assert_eq!(get_value("A1"), "Company Report");
        assert!(is_bold("A1"), "Template header should remain bold");
        assert_eq!(get_value("A2"), "Generated on: [Date]");

        // Verify custom header from HTML was inserted
        assert_eq!(get_value("C2"), "Report Date: 2025-07-17");

        // Verify data table headers start at the specified row (5)
        assert_eq!(get_value("A5"), "Product");
        assert_eq!(get_value("B5"), "Unit");
        assert_eq!(get_value("C5"), "Price");
        assert!(is_bold("A5"), "Data headers should be bold");

        // Verify first few data rows
        assert_eq!(get_value("A6"), "Item 1");
        assert_eq!(get_value("B6"), "Unit 1");
        assert_eq!(get_value("C6"), "10"); // Note: Excel may strip trailing zeros

        assert_eq!(get_value("A10"), "Item 5");

        // Item 9 should be at row 14 (5 + 1 header + 8 data rows)
        assert_eq!(get_value("A14"), "Item 9");
        assert_eq!(get_value("C14"), "90"); // Item 9

        // Verify total row (should be at row 17: 5 + 1 header + 10 data + 1 blank)
        assert_eq!(get_value("B17"), "Total:");
        assert_eq!(get_value("C17"), "550"); // Note: Excel may strip trailing zeros
        assert!(is_bold("B17"), "Total row should be bold");

        // Verify template footer is preserved
        assert_eq!(get_value("A20"), "End of Report");
        assert!(is_bold("A20"), "Template footer should remain bold");
        assert_eq!(get_value("A21"), "Company Footer Info");

        // Clean up temp file
        std::fs::remove_file(temp_path).ok();
    }
}
