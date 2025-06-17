use base64::prelude::*;
use chrono::{DateTime, Utc};
use log::error;
use repository::{
    migrations::Version, EqualFilter, Pagination, PaginationOption, Report, ReportFilter,
    ReportMetaData, ReportRepository, ReportRowRepository, ReportSort, RepositoryError,
};
use scraper::{ElementRef, Html, Selector};
use serde::{Deserialize, Serialize};
use std::{cmp::Ordering, collections::HashMap, time::SystemTime};
use thiserror::Error;
use umya_spreadsheet::{
    drawing::spreadsheet::MarkerType, helper::coordinate::coordinate_from_index, Cell, FontSize,
    Image, Range,
};
use util::{format_error, uuid::uuid};

use crate::{
    boajs::{call_method, BoaJsError},
    get_default_pagination, i64_to_u32,
    localisations::{Localisations, TranslationError},
    service_provider::ServiceContext,
    static_files::{StaticFileCategory, StaticFileService},
    ListError, ListResult,
};

use super::{
    default_queries::get_default_gql_query,
    definition::{
        ConvertDataType, GraphQlQuery, ReportDefinition, ReportDefinitionEntry, ReportRef,
        SQLQuery, TeraTemplate,
    },
    html_printing::html_to_pdf,
    qr_code::qr_code_svg,
    utils::translate_report_arugment_schema,
};

pub enum PrintFormat {
    Pdf,
    Html,
    Excel,
}

#[derive(Debug, Error)]
pub enum ConvertDataError {
    #[error(transparent)]
    Extism(anyhow::Error),
    #[error("BoaJs error: {0}")]
    BoaJs(String),
}

#[derive(Debug)]
pub enum ReportError {
    RepositoryError(RepositoryError),
    ReportDefinitionNotFound { report_id: String, msg: String },
    TemplateNotSpecified,
    QueryNotSpecified,
    MultipleGraphqlQueriesNotAllowed,
    InvalidReportDefinition(String),
    QueryError(String),
    DocGenerationError(String),
    HTMLToPDFError(String),
    TranslationError,
    ConvertDataError(ConvertDataError),
}

#[derive(Debug, Clone)]
pub enum ResolvedReportQuery {
    SQLQuery(SQLQuery),
    /// Custom http query
    GraphQlQuery(GraphQlQuery),
}

/// Resolved and validated report definition, i.e. its guaranteed that there is a main template and
/// query present that can be rendered
#[derive(Default)]
pub struct ResolvedReportDefinition {
    pub name: String,
    /// Reference to the main template in the templates map
    pub template: String,
    /// Reference to the header entry in the templates map
    pub header: Option<String>,
    /// Reference to the footer entry in the templates map
    pub footer: Option<String>,
    /// Map of all found Tera templates in the report definition
    pub templates: HashMap<String, TeraTemplate>,
    pub queries: Vec<ResolvedReportQuery>,
    pub resources: HashMap<String, serde_json::Value>,
    pub convert_data: Option<String>,
    pub convert_data_type: ConvertDataType,
}

pub struct GeneratedReport {
    pub document: String,
    pub header: Option<String>,
    pub footer: Option<String>,
}

pub trait ReportServiceTrait: Sync + Send {
    fn get_report(
        &self,
        ctx: &ServiceContext,
        translation_service: &Box<Localisations>,
        user_language: String,
        id: &str,
    ) -> Result<Report, GetReportError> {
        get_report(ctx, translation_service, user_language, id)
    }

    fn query_reports(
        &self,
        ctx: &ServiceContext,
        translation_service: &Box<Localisations>,
        user_language: String,
        filter: Option<ReportFilter>,
        sort: Option<ReportSort>,
    ) -> Result<Vec<Report>, GetReportsError> {
        query_reports(ctx, translation_service, user_language, filter, sort)
    }

    fn query_all_report_versions(
        &self,
        ctx: &ServiceContext,
        translation_service: &Box<Localisations>,
        user_language: String,
        filter: Option<ReportFilter>,
        sort: Option<ReportSort>,
        pagination: Option<PaginationOption>,
    ) -> Result<ListResult<Report>, GetReportsError> {
        query_all_report_versions(
            ctx,
            translation_service,
            user_language,
            filter,
            sort,
            pagination,
        )
    }

    /// Loads a report definition by id and resolves it
    fn resolve_report(
        &self,
        ctx: &ServiceContext,
        report_id: &str,
    ) -> Result<ResolvedReportDefinition, ReportError> {
        resolve_report(ctx, report_id)
    }

    /// Resolve a already loaded report definition
    fn resolve_report_definition(
        &self,
        ctx: &ServiceContext,
        name: String,
        report_definition: ReportDefinition,
    ) -> Result<ResolvedReportDefinition, ReportError> {
        resolve_report_definition(ctx, name, report_definition)
    }

    /// Converts a HTML report to a file for the target PrintFormat and returns file id
    fn generate_html_report(
        &self,
        base_dir: &Option<String>,
        report: &ResolvedReportDefinition,
        report_data: serde_json::Value,
        arguments: Option<serde_json::Value>,
        format: Option<PrintFormat>,
        translation_service: &Localisations,
        current_language: Option<String>,
    ) -> Result<String, ReportError> {
        let document = generate_report(
            report,
            report_data,
            arguments,
            translation_service,
            current_language,
        )?;

        match format {
            Some(PrintFormat::Html) => {
                generate_html_report_to_html(base_dir, document, report.name.clone())
            }
            Some(PrintFormat::Excel) => {
                print_html_report_to_excel(base_dir, document, report.name.clone())
            }
            Some(PrintFormat::Pdf) | None => {
                generate_html_report_to_pdf(base_dir, document, report.name.clone())
            }
        }
    }
}

/// Converts a HTML report to a pdf file and returns the file id
fn generate_html_report_to_pdf(
    base_dir: &Option<String>,
    document: GeneratedReport,
    report_name: String,
) -> Result<String, ReportError> {
    let id = uuid();
    // TODO use a proper tmp dir here instead of base_dir?
    let pdf = html_to_pdf(base_dir, &format_html_document(document), &id)
        .map_err(|err| ReportError::HTMLToPDFError(format!("{}", err)))?;

    let file_service = StaticFileService::new(base_dir)
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;
    let now: DateTime<Utc> = SystemTime::now().into();
    let file = file_service
        .store_file(
            &format!("{}_{}.pdf", now.format("%Y%m%d_%H%M%S"), report_name),
            StaticFileCategory::Temporary,
            &pdf,
        )
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;
    Ok(file.id)
}

/// Converts the report to a HTML file and returns the file id
fn generate_html_report_to_html(
    base_dir: &Option<String>,
    document: GeneratedReport,
    report_name: String,
) -> Result<String, ReportError> {
    let file_service = StaticFileService::new(base_dir)
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;
    let now: DateTime<Utc> = SystemTime::now().into();
    let file = file_service
        .store_file(
            &format!("{}_{}.html", now.format("%Y%m%d_%H%M%S"), report_name),
            StaticFileCategory::Temporary,
            format_html_document(document).as_bytes(),
        )
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;
    Ok(file.id)
}

struct Selectors<'a> {
    html: &'a Html,
}

impl<'a> Selectors<'a> {
    fn new(html: &'a Html) -> Self {
        Self { html }
    }

    fn header_rows_and_cells(&self) -> Vec<Vec<ElementRef>> {
        let rows_selector = Selector::parse(".paging thead table tr").unwrap();
        let cells_selector = Selector::parse("td").unwrap();
        self.html
            .select(&rows_selector)
            .map(|row| row.select(&cells_selector).collect())
            .collect()
    }

    fn data_headers(&self) -> Vec<&str> {
        let headers_selector = Selector::parse(".paging tbody thead tr td,th").unwrap();
        self.html
            .select(&headers_selector)
            .map(inner_text)
            .collect()
    }

    fn rows_and_cells(&self) -> Vec<Vec<&str>> {
        let rows_selector = Selector::parse(".paging tbody tbody tr").unwrap();
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

fn get_cell_coords(cell: ElementRef, col: u32, row: u32) -> (String, String) {
    let cols = cell
        .attr("colspan")
        .and_then(|cols| cols.parse::<u32>().ok())
        .unwrap_or(1);
    let rows = cell
        .attr("rowspan")
        .and_then(|rows| rows.parse::<u32>().ok())
        .unwrap_or(1);

    let start_coord = coordinate_from_index(&col, &row);
    let end_coord = coordinate_from_index(&(col + cols - 1), &(row + rows - 1));

    (start_coord, end_coord)
}

fn get_image_data(cell: ElementRef) -> Option<(Option<String>, Vec<u8>)> {
    let image_selector = Selector::parse("img").unwrap();
    let img = cell.select(&image_selector).nth(0)?;

    let img_data = img.attr("src").and_then(|src| {
        let base64_data = src.split("base64,").nth(1)?;
        match BASE64_STANDARD.decode(base64_data) {
            Ok(data) => Some(data),
            Err(e) => {
                // Log error but then return None, just won't render the image
                error!("Error decoding base64 image: {:?}", e);
                return None;
            }
        }
    })?;

    let img_name = img.attr("alt").map(|alt| alt.to_string());

    Some((img_name, img_data))
}

fn get_image(image_data: (Option<String>, Vec<u8>), coordinate: String, dimension: u32) -> Image {
    let (img_name, base_64_img_data) = image_data;

    let mut marker = MarkerType::default();
    marker.set_coordinate(coordinate.clone());

    let mut image = Image::default();

    image.new_image_with_dimensions(
        dimension,
        dimension,
        &img_name.unwrap_or(coordinate),
        base_64_img_data,
        marker,
    );

    image
}

fn apply_known_styles(cell: &mut Cell, class_name: &str) {
    let style = cell.get_style_mut();

    match class_name {
        "title" => {
            let mut font_size = FontSize::default();
            font_size.set_val(16.0);
            style.get_font_mut().set_bold(true).set_font_size(font_size);
        }
        "bold" => {
            style.get_font_mut().set_bold(true);
        }
        _ => {
            // Unknown class, do nothing
        }
    }
}

/// Converts the report to an Excel file and returns the file id
fn print_html_report_to_excel(
    base_dir: &Option<String>,
    document: GeneratedReport,
    report_name: String,
) -> Result<String, ReportError> {
    let sheet_name = "Report";

    let mut book = umya_spreadsheet::new_file();
    book.set_sheet_name(0, sheet_name).unwrap();
    let sheet = book.get_sheet_by_name_mut(sheet_name).unwrap();

    let formatted = format_html_document(document);
    let fragment = Html::parse_fragment(&formatted);
    let selectors = Selectors::new(&fragment); // Store Html when creating

    let mut row_idx: u32 = 1;

    // HEADER
    for row in selectors.header_rows_and_cells().into_iter() {
        let mut cell_idx: u32 = 1;
        for cell in row.into_iter() {
            // If the cell index is merged, we should move over and put the rest of the row content after that
            let merged_cells = sheet.get_merge_cells();
            merged_cells.iter().for_each(|range| {
                cell_idx += get_num_cells_to_skip(range, cell_idx, row_idx);
            });

            let (start_coord, end_coord) = get_cell_coords(cell, cell_idx, row_idx);

            if start_coord != end_coord {
                // If the start and end coordinates are different, we merge those cells
                sheet.add_merge_cells(&format!("{}:{}", start_coord, end_coord));
            }

            // If cell contains image, add that to the sheet cell
            if let Some(image_data) = get_image_data(cell) {
                // Set image width probably needs to be passed in at some - for now 60 = close to default col width
                let image = get_image(image_data, start_coord, 60);

                sheet.add_image(image);

            // Otherwise set text content
            } else {
                let text = inner_text(cell);
                if !text.is_empty() {
                    let sheet_cell = sheet
                        .get_cell_mut((cell_idx, row_idx))
                        .set_value(inner_text(cell));

                    if let Some(class) = cell.attr("class") {
                        apply_known_styles(sheet_cell, class);
                    };
                }
            }

            cell_idx += 1; // Next cell
        }
        row_idx += 1; // Next row
    }
    row_idx += 1; // Leave a row before the main data table

    // HEADER ROW FOR MAIN DATA
    for (index, header) in selectors.data_headers().into_iter().enumerate() {
        let cell = sheet.get_cell_mut((index as u32 + 1, row_idx));

        cell.set_value(header);
        cell.get_style_mut().get_font_mut().set_bold(true);
    }
    row_idx += 1; // Next row

    // MAIN DATA
    for row in selectors.rows_and_cells().into_iter() {
        for (cell_index, cell) in row.into_iter().enumerate() {
            sheet
                .get_cell_mut((cell_index as u32 + 1, row_idx))
                .set_value(cell);
        }
        row_idx += 1; // Next row
    }

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

    umya_spreadsheet::writer::xlsx::write(&book, reserved_file.path)
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;

    Ok(reserved_file.id)
}

fn get_num_cells_to_skip(range: &Range, cell_idx: u32, row_idx: u32) -> u32 {
    let (start_col, start_row) = match (
        range.get_coordinate_start_col(),
        range.get_coordinate_start_row(),
    ) {
        (Some(col), Some(row)) => (*col.get_num(), *row.get_num()),
        _ => return 0, // Invalid start coordinate
    };

    if cell_idx < start_col || row_idx < start_row {
        return 0; // Current cell is before the merged range
    }

    let (end_col, end_row) = match (
        range.get_coordinate_end_col(),
        range.get_coordinate_end_row(),
    ) {
        (Some(col), Some(row)) => (*col.get_num(), *row.get_num()),
        _ => return 0, // Invalid end coordinate
    };

    if cell_idx > end_col || row_idx > end_row {
        return 0; // Current cell is after the merged range
    }
    end_col - cell_idx + 1
}

/// Puts the document content, header and footer into a <html> template.
/// This assumes that the document contains the html body.
fn format_html_document(document: GeneratedReport) -> String {
    // ensure that <html> is at the start of the text
    // if not, the cordova printer plugin renders as text not HTML!
    format!(
        "<html>
    <body>
        <table class=\"paging\">
            <thead>
                <tr>
                <td>{}</td>
                </tr>
            </thead>
            <tbody>
                <tr>
                <td>{}</td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                <td>{}</td>
                </tr>
            </tfoot>
        </table>
    </body>
</html>",
        document.header.unwrap_or("".to_string()),
        document.document,
        document.footer.unwrap_or("".to_string())
    )
}

pub struct ReportService;
impl ReportServiceTrait for ReportService {}

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

#[derive(Debug)]
pub enum GetReportError {
    TranslationError(TranslationError),
    RepositoryError(RepositoryError),
}

fn get_report(
    ctx: &ServiceContext,
    translation_service: &Box<Localisations>,
    user_language: String,
    id: &str,
) -> Result<Report, GetReportError> {
    let report = ReportRepository::new(&ctx.connection)
        .query_by_filter(ReportFilter::new().id(EqualFilter::equal_to(id)))
        .map_err(|e| GetReportError::RepositoryError(e))?
        .pop()
        .ok_or(GetReportError::RepositoryError(RepositoryError::NotFound))?;

    let report = translate_report_arugment_schema(report, translation_service, &user_language)
        .map_err(GetReportError::TranslationError)?;

    Ok(report)
}

#[derive(Debug)]
pub enum GetReportsError {
    TranslationError(TranslationError),
    ListError(ListError),
}

fn query_reports(
    ctx: &ServiceContext,
    translation_service: &Box<Localisations>,
    user_language: String,
    filter: Option<ReportFilter>,
    sort: Option<ReportSort>,
) -> Result<Vec<Report>, GetReportsError> {
    let app_version: Version = Version::from_package_json();

    let repo = ReportRepository::new(&ctx.connection);
    let reports_to_show_meta_data = report_filter_method(
        repo.query_meta_data(filter.clone(), None)
            .map_err(|err| GetReportsError::ListError(ListError::DatabaseError(err)))?,
        app_version,
    );

    let filter = ReportFilter::new().id(EqualFilter::equal_any(reports_to_show_meta_data));

    let reports = repo
        .query(Pagination::all(), Some(filter), sort)
        .map_err(|err| GetReportsError::ListError(ListError::DatabaseError(err)))?;

    let reports = reports
        .into_iter()
        .map(|r| {
            translate_report_arugment_schema(r, translation_service, &user_language)
                .map_err(GetReportsError::TranslationError)
        })
        .collect::<Result<Vec<Report>, GetReportsError>>();

    reports
}

fn query_all_report_versions(
    ctx: &ServiceContext,
    translation_service: &Box<Localisations>,
    user_language: String,
    filter: Option<ReportFilter>,
    sort: Option<ReportSort>,
    pagination: Option<PaginationOption>,
) -> Result<ListResult<Report>, GetReportsError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)
        .map_err(GetReportsError::ListError)?;

    let repo = ReportRepository::new(&ctx.connection);

    let reports = repo
        .query(pagination, filter.clone(), sort)
        .map_err(|err| GetReportsError::ListError(ListError::DatabaseError(err)))?;

    // we don't return schema currently - but maybe we will need so leaving here for now
    let reports = reports
        .into_iter()
        .map(|r| {
            translate_report_arugment_schema(r, translation_service, &user_language)
                .map_err(GetReportsError::TranslationError)
        })
        .collect::<Result<Vec<Report>, GetReportsError>>()?;

    Ok(ListResult {
        count: i64_to_u32(
            repo.count(filter)
                .map_err(|err| GetReportsError::ListError(ListError::DatabaseError(err)))?,
        ),
        rows: reports,
    })
}

fn report_filter_method(reports: Vec<ReportMetaData>, app_version: Version) -> Vec<String> {
    let reports_with_compatible_versions: Vec<ReportMetaData> = reports
        .into_iter()
        .filter(|r| compare_major_minor(r.version.clone(), &app_version) != Ordering::Greater)
        .collect();

    let mut codes: Vec<String> = reports_with_compatible_versions
        .iter()
        .map(|r| r.code.clone())
        .collect();
    codes.dedup();

    let mut reports_to_show: Vec<String> = vec![];
    for code in codes {
        let reports_of_code: Vec<ReportMetaData> = reports_with_compatible_versions
            .clone()
            .into_iter()
            .filter(|r| r.code == code)
            .collect();
        let custom_reports_of_code: Vec<ReportMetaData> = reports_of_code
            .clone()
            .into_iter()
            .filter(|r| r.is_custom)
            .collect();
        if !custom_reports_of_code.is_empty() {
            if let Some(report) = find_latest_report(custom_reports_of_code) {
                reports_to_show.push(report.id);
            }
        } else if let Some(report) = find_latest_report(reports_of_code) {
            reports_to_show.push(report.id);
        }
    }
    reports_to_show
}

fn find_latest_report(reports: Vec<ReportMetaData>) -> Option<ReportMetaData> {
    reports
        .into_iter()
        .max_by(|a, b| a.version.partial_cmp(&b.version).unwrap())
}

fn compare_major_minor(first: Version, second: &Version) -> Ordering {
    if first.major != second.major {
        return first.major.cmp(&second.major);
    }
    if first.minor != second.minor {
        return first.minor.cmp(&second.minor);
    }
    Ordering::Equal
}

fn resolve_report(
    ctx: &ServiceContext,
    report_id: &str,
) -> Result<ResolvedReportDefinition, ReportError> {
    let repo = ReportRowRepository::new(&ctx.connection);

    let (report_name, main) = load_report_definition(&repo, report_id)?;
    resolve_report_definition(ctx, report_name, main)
}

fn resolve_report_definition(
    ctx: &ServiceContext,
    name: String,
    main: ReportDefinition,
) -> Result<ResolvedReportDefinition, ReportError> {
    let repo = ReportRowRepository::new(&ctx.connection);
    let fully_loaded_report = load_template_references(&repo, &ctx.store_id, main)?;

    let templates = tera_templates_from_resolved_template(&fully_loaded_report)
        .ok_or(ReportError::TemplateNotSpecified)?;

    // validate index entries are present
    let template =
        fully_loaded_report
            .index
            .template
            .clone()
            .ok_or(ReportError::InvalidReportDefinition(
                "Template reference missing".to_string(),
            ))?;
    if !templates.contains_key(&template) {
        return Err(ReportError::InvalidReportDefinition(format!(
            "Invalid template reference: {}",
            template
        )));
    }
    if let Some(header) = fully_loaded_report.index.header.clone() {
        if !templates.contains_key(&header) {
            return Err(ReportError::InvalidReportDefinition(format!(
                "Invalid template header reference: {}",
                header
            )));
        }
    }
    if let Some(footer) = fully_loaded_report.index.footer.clone() {
        if !templates.contains_key(&footer) {
            return Err(ReportError::InvalidReportDefinition(format!(
                "Invalid template footer reference: {}",
                footer
            )));
        }
    }
    let query_entry = fully_loaded_report
        .index
        .query
        .iter()
        .map(|query| match fully_loaded_report.entries.get(query) {
            Some(query_entry) => Ok(query_entry),
            None => Err(ReportError::InvalidReportDefinition(format!(
                "Invalid query reference: {}",
                query
            ))),
        })
        .collect::<Result<Vec<_>, ReportError>>()?;

    // resolve the query entry
    let queries = query_from_resolved_template(query_entry)?;

    let resources = resources_from_resolved_template(&fully_loaded_report);
    Ok(ResolvedReportDefinition {
        name,
        template,
        header: fully_loaded_report.index.header.clone(),
        footer: fully_loaded_report.index.footer.clone(),
        templates,
        queries,
        resources,
        convert_data: fully_loaded_report.index.convert_data,
        convert_data_type: fully_loaded_report.index.convert_data_type,
    })
}

#[derive(Serialize, Deserialize)]
struct ReportData {
    data: serde_json::Value,
    arguments: Option<serde_json::Value>,
}

fn transform_data(
    data: ReportData,
    convert_data: Option<String>,
    convert_data_type: &ConvertDataType,
) -> Result<ReportData, ConvertDataError> {
    let Some(convert_data) = convert_data else {
        return Ok(data);
    };

    match convert_data_type {
        // Mapping to string via format_error since it's better then debug output on error
        ConvertDataType::BoaJs => transform_data_boajs(data, convert_data)
            .map_err(|e| ConvertDataError::BoaJs(format_error(&e))),
        ConvertDataType::Extism => Err(ConvertDataError::Extism(anyhow::anyhow!(
            "Extism convert data no longer implemented."
        ))),
    }
}

fn transform_data_boajs(data: ReportData, convert_data: String) -> Result<ReportData, BoaJsError> {
    call_method(
        data,
        vec!["convert_data"],
        &BASE64_STANDARD.decode(convert_data).unwrap(),
    )
}

fn generate_report(
    report: &ResolvedReportDefinition,
    data: serde_json::Value,
    arguments: Option<serde_json::Value>,
    translation_service: &Localisations,
    current_language: Option<String>,
) -> Result<GeneratedReport, ReportError> {
    let report_data = ReportData { data, arguments };
    let report_data = transform_data(
        report_data,
        report.convert_data.clone(),
        &report.convert_data_type,
    )
    .map_err(|err| {
        error!(
            "Error transforming data for report {}: {}",
            report.name,
            format_error(&err)
        );
        ReportError::ConvertDataError(err)
    })?;

    let mut context = tera::Context::from_serialize(report_data).map_err(|err| {
        ReportError::DocGenerationError(format!("Tera context from data: {:?}", err))
    })?;
    // TODO: Validate if used and if needed
    context.insert("res", &report.resources);

    let mut tera = tera::Tera::default();

    tera.register_function(
        "qr_code",
        move |args: &HashMap<String, serde_json::Value>| {
            let data = args
                .get("data")
                .ok_or_else(|| tera::Error::msg("qr_code filter expects a `data` argument"))?;
            let data = data.as_str().ok_or_else(|| {
                tera::Error::msg("qr_code filter expects a string `data` argument")
            })?;

            let html_src = qr_code_svg(data);
            Ok(tera::Value::String(html_src))
        },
    );

    tera.register_function(
        "t",
        translation_service.get_translation_function(current_language),
    );

    let mut templates: HashMap<String, String> = report
        .templates
        .iter()
        .map(|(name, template)| (name.to_string(), template.template.to_string()))
        .collect();
    // also add resources to the templates
    for resource in &report.resources {
        let string_value = if let serde_json::Value::String(string) = resource.1 {
            string.clone()
        } else {
            serde_json::to_string(&resource.1).map_err(|err| {
                ReportError::DocGenerationError(format!(
                    "Failed to stringify resource {}: {}",
                    resource.0, err
                ))
            })?
        };
        templates.insert(resource.0.clone(), string_value);
    }
    tera.add_raw_templates(templates.iter()).map_err(|err| {
        ReportError::DocGenerationError(format!("Failed to add templates: {:?}", err))
    })?;

    let document = tera
        .render(&report.template, &context)
        .map_err(|err| ReportError::DocGenerationError(format!("Tera rendering: {:?}", err)))?;
    let header = match &report.header {
        Some(header_key) => {
            let header = tera.render(header_key, &context).map_err(|err| {
                ReportError::DocGenerationError(format!("Header generation: {}", err))
            })?;
            Some(header)
        }
        None => None,
    };
    let footer = match &report.footer {
        Some(footer_ref) => {
            let footer = tera.render(footer_ref, &context).map_err(|err| {
                ReportError::DocGenerationError(format!("Footer generation: {}", err))
            })?;
            Some(footer)
        }
        None => None,
    };

    Ok(GeneratedReport {
        document,
        header,
        footer,
    })
}

fn tera_templates_from_resolved_template(
    report: &ReportDefinition,
) -> Option<HashMap<String, TeraTemplate>> {
    let mut templates = HashMap::new();
    for (name, entry) in &report.entries {
        if let ReportDefinitionEntry::TeraTemplate(template) = entry {
            templates.insert(name.clone(), template.clone());
        }
    }
    Some(templates)
}

fn query_from_resolved_template(
    query_entries: Vec<&ReportDefinitionEntry>,
) -> Result<Vec<ResolvedReportQuery>, ReportError> {
    let mut graphql_queries = Vec::<ResolvedReportQuery>::new();
    let mut default_queries = Vec::<ResolvedReportQuery>::new();
    let mut sql_queries = Vec::<ResolvedReportQuery>::new();

    query_entries.into_iter().for_each(|entry| match entry {
        ReportDefinitionEntry::GraphGLQuery(query) => {
            graphql_queries.push(ResolvedReportQuery::GraphQlQuery(query.clone()))
        }
        ReportDefinitionEntry::SQLQuery(query) => {
            sql_queries.push(ResolvedReportQuery::SQLQuery(query.clone()))
        }
        ReportDefinitionEntry::DefaultQuery(query) => default_queries.push(
            ResolvedReportQuery::GraphQlQuery(get_default_gql_query(query.clone())),
        ),
        _ => {}
    });
    if graphql_queries.len() + default_queries.len() > 1 {
        return Err(ReportError::MultipleGraphqlQueriesNotAllowed);
    }
    let queries: Vec<_> = graphql_queries
        .into_iter()
        .chain(default_queries)
        .chain(sql_queries)
        .collect();
    if queries.is_empty() {
        return Err(ReportError::QueryNotSpecified);
    }
    Ok(queries)
}

fn resources_from_resolved_template(
    report: &ReportDefinition,
) -> HashMap<String, serde_json::Value> {
    report
        .entries
        .iter()
        .filter_map(|(name, entry)| match entry {
            ReportDefinitionEntry::Resource(ref resource) => Some((name.clone(), resource.clone())),
            ReportDefinitionEntry::Manifest(ref manifest) => {
                let Ok(value) = serde_json::to_value(manifest) else {
                    // should not happen
                    return None;
                };
                Some((name.clone(), value))
            }
            ReportDefinitionEntry::DefaultQuery(_)
            | ReportDefinitionEntry::GraphGLQuery(_)
            | ReportDefinitionEntry::Ref(_)
            | ReportDefinitionEntry::SQLQuery(_)
            | ReportDefinitionEntry::TeraTemplate(_) => None,
        })
        .collect()
}

fn load_report_definition(
    repo: &ReportRowRepository,
    report_id: &str,
) -> Result<(String, ReportDefinition), ReportError> {
    let row = match repo.find_one_by_id(report_id)? {
        Some(row) => row,
        None => {
            return Err(ReportError::ReportDefinitionNotFound {
                report_id: report_id.to_string(),
                msg: "Can't find root report".to_string(),
            })
        }
    };
    let def = serde_json::from_str::<ReportDefinition>(&row.template).map_err(|err| {
        ReportError::InvalidReportDefinition(format!("Can't parse report: {}", err))
    })?;
    Ok((row.name, def))
}

fn load_template_references(
    repo: &ReportRowRepository,
    store_id: &str,
    report: ReportDefinition,
) -> Result<ReportDefinition, ReportError> {
    let mut out = ReportDefinition {
        index: report.index.clone(),
        entries: HashMap::new(),
    };
    for (name, entry) in report.entries {
        match entry {
            ReportDefinitionEntry::Ref(reference) => {
                let resolved_ref = resolve_ref(repo, store_id, &name, &reference)?;
                out.entries.insert(name, resolved_ref)
            }
            _ => out.entries.insert(name, entry),
        };
    }
    Ok(out)
}

fn resolve_ref(
    repo: &ReportRowRepository,
    // TODO: should reports stored by store_id?
    _store_id: &str,
    ref_name: &str,
    ref_entry: &ReportRef,
) -> Result<ReportDefinitionEntry, ReportError> {
    let mut ref_report = load_report_definition(repo, &ref_entry.source)?.1;
    let source_name = match &ref_entry.source_name {
        Some(source_name) => source_name,
        None => ref_name,
    };
    let entry =
        ref_report
            .entries
            .remove(source_name)
            .ok_or(ReportError::InvalidReportDefinition(format!(
                "Invalid reference {:?}",
                ref_entry
            )))?;

    Ok(entry)
}

impl From<RepositoryError> for ReportError {
    fn from(err: RepositoryError) -> Self {
        ReportError::RepositoryError(err)
    }
}

impl From<std::io::Error> for ReportError {
    fn from(_err: std::io::Error) -> Self {
        ReportError::TranslationError
    }
}

#[cfg(test)]
mod report_service_test {
    use std::collections::HashMap;

    use repository::{
        mock::MockDataInserts, test_db::setup_all, ContextType, ReportRow, ReportRowRepository,
    };

    use crate::{
        report::{
            definition::{
                DefaultQuery, ReportDefinition, ReportDefinitionEntry, ReportDefinitionIndex,
                ReportOutputType, ReportRef, TeraTemplate,
            },
            report_service::generate_report,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn generate_tera_html_document() {
        let report_1 = ReportDefinition {
            index: ReportDefinitionIndex {
                template: Some("template.html".to_string()),
                footer: Some("footer.html".to_string()),
                query: vec!["query".to_string()],
                ..Default::default()
            },
            entries: HashMap::from([
                (
                    "template.html".to_string(),
                    ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                        output: ReportOutputType::Html,
                        template: "Template: {{data.test}} {% include \"footer.html\" %}"
                            .to_string(),
                    }),
                ),
                (
                    "footer.html".to_string(),
                    ReportDefinitionEntry::Ref(ReportRef {
                        source: "report_base_1".to_string(),
                        source_name: None,
                    }),
                ),
                (
                    "query".to_string(),
                    ReportDefinitionEntry::DefaultQuery(DefaultQuery::Invoice),
                ),
            ]),
        };
        let report_base_1 = ReportDefinition {
            index: ReportDefinitionIndex {
                template: None,
                header: None,
                footer: Some("footer.html".to_string()),
                query: vec![],
                ..Default::default()
            },
            entries: HashMap::from([(
                "footer.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: "{% block footer %}Footer{% endblock footer %}".to_string(),
                }),
            )]),
        };

        let (_, connection, connection_manager, _) =
            setup_all("generate_tera_html_document", MockDataInserts::all()).await;
        let repo = ReportRowRepository::new(&connection);

        repo.upsert_one(&ReportRow {
            id: "report_1".to_string(),
            name: "Report 1".to_string(),
            template: serde_json::to_string(&report_1).unwrap(),
            context: ContextType::InboundShipment,
            comment: None,
            sub_context: None,
            argument_schema_id: None,
            is_custom: true,
            version: "1.0".to_string(),
            code: "report_1".to_string(),
            is_active: true,
        })
        .unwrap();

        repo.upsert_one(&ReportRow {
            id: "report_base_1".to_string(),
            name: "Report base 1".to_string(),
            template: serde_json::to_string(&report_base_1).unwrap(),
            context: ContextType::Resource,
            comment: None,
            sub_context: None,
            argument_schema_id: None,
            is_custom: true,
            version: "1.0".to_string(),
            code: "report_base_1".to_string(),
            is_active: true,
        })
        .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("store_id".to_string(), "".to_string())
            .unwrap();
        let service = &service_provider.report_service;
        let translation_service = &service_provider.translations_service;
        let resolved_def = service.resolve_report(&context, "report_1").unwrap();

        let doc = generate_report(
            &resolved_def,
            serde_json::json!({
                "test": "Hello"
            }),
            None,
            translation_service,
            None,
        )
        .unwrap();
        assert_eq!(doc.document, "Template: Hello Footer");
    }
}

#[cfg(test)]
mod report_to_excel_test {
    use scraper::Html;

    use super::*;

    #[test]
    fn test_selectors() {
        let html = Html::parse_fragment(
            r#"
<html>
   <body>
      <table class="paging">
         <thead>
            <tr>
               <td>
                    <table>
                        <thead>
                           <tr>
                              <td>Report Title</td>
                           </tr>
                        </thead>
                    </table>
               </td>
            </tr>
         </thead>
         <tbody>
            <tr>
               <td>
                  <style>
                  </style>
                  <div class="container">
                     <table>
                        <thead>
                           <tr class="heading">
                              <td>First Header</td>
                              <td>Second Header</td>
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
               </td>
            </tr>
         </tbody>
         <tfoot>
            <tr>
               <td></td>
            </tr>
         </tfoot>
      </table>
   </body>
</html>

    "#,
        );

        let selectors = Selectors::new(&html);

        let header = selectors.header_rows_and_cells();
        assert_eq!(header.len(), 1);
        assert_eq!(header[0].len(), 1);
        assert_eq!(inner_text(header[0][0]), "Report Title");

        assert_eq!(
            selectors.data_headers(),
            vec!["First Header", "Second Header"]
        );

        assert_eq!(
            selectors.rows_and_cells(),
            vec![
                vec!["Row One Cell One", "Row One Cell Two"],
                vec!["Row Two Cell One", "Row Two Cell Two"]
            ]
        );
    }

    #[test]
    fn test_inner_text() {
        let html = Html::parse_fragment(
            r#"
<html>
   <body>
      <table>
         <tbody>
            <tr>
               <td class="status"> 
                  <span class="out-of-stock">Out of Stock</span>
               </td>
                <td class="status"> 
                  Out of Stock
               </td>
            </tr>
         </tbody>
      </table>         
   </body>
</html>

        "#,
        );

        let cells_selector = Selector::parse("td").unwrap();
        let mut cells = html.select(&cells_selector);
        let cell = cells.next().unwrap();

        assert_eq!(inner_text(cell), "Out of Stock");

        let cell = cells.next().unwrap();

        assert_eq!(inner_text(cell), "Out of Stock");
    }

    #[test]
    fn test_get_img_src() {
        let html = Html::parse_fragment(
            r#"
<html>
   <body>
      <table>
         <tbody>
            <tr>
               <td class="status"> 
                  <img alt="store logo" src="data:image&#x2F;png;base64,c29tZS1zcmM=" /> <!-- base64 encoded "some-src" -->
               </td>
            </tr>
         </tbody>
      </table>         
   </body>
</html>

        "#,
        );

        let cells_selector = Selector::parse("td").unwrap();
        let mut cells = html.select(&cells_selector);
        let cell = cells.next().unwrap();

        assert_eq!(
            get_image_data(cell).unwrap(),
            (
                Some("store logo".to_string()), // alt text
                // "some-src" as bytes
                vec![115, 111, 109, 101, 45, 115, 114, 99]
            )
        );
    }

    #[test]
    fn test_get_cell_coords() {
        let html = Html::parse_fragment(
            r#"
<html>
   <body>
      <table>
         <tbody>
            <tr>
               <td colspan="2" rowspan="3"> 
                Some Text
               </td>
            </tr>
         </tbody>
      </table>         
   </body>
</html>

        "#,
        );

        let cells_selector = Selector::parse("td").unwrap();
        let mut cells = html.select(&cells_selector);
        let cell = cells.next().unwrap();

        assert_eq!(
            get_cell_coords(cell, 2, 2),
            ("B2".to_string(), "C4".to_string())
        );
    }

    #[test]
    fn test_get_num_cells_to_skip() {
        let mut range = Range::default();
        range.set_range("B2:D3".to_string());

        // 1,1 = A1 = not within merged cell block
        assert_eq!(get_num_cells_to_skip(&range, 1, 1), 0);

        // 3,1 = C1 = not within merged cell block
        assert_eq!(get_num_cells_to_skip(&range, 3, 1), 0);

        // 1,2 = A2 = not within merged cell block
        assert_eq!(get_num_cells_to_skip(&range, 1, 2), 0);

        // 3,2 = C2 = within merged cell block
        assert_eq!(get_num_cells_to_skip(&range, 3, 2), 2); // should get bumped 2 cells (next available column is E)

        // 4,3 = D3 = within merged cell block
        assert_eq!(get_num_cells_to_skip(&range, 4, 3), 1); // should get bumped 1 cell

        // 5,4 = E4 = not within merged cell block
        assert_eq!(get_num_cells_to_skip(&range, 5, 4), 0);
    }
}

#[cfg(test)]
mod report_generation_test {
    use std::collections::HashMap;

    use repository::{mock::MockDataInserts, test_db::setup_all};
    use serde_json::json;

    use crate::{
        report::{
            definition::{ReportOutputType, TeraTemplate},
            report_service::{generate_report, ResolvedReportDefinition},
        },
        service_provider::ServiceProvider,
    };
    // adding tests to generate reports

    #[actix_rt::test]

    async fn test_standard_report_generation() {
        let template_content = include_str!("templates/test.html").to_string();

        let tera_template = TeraTemplate {
            template: template_content,
            output: ReportOutputType::Html,
        };

        let (_, _, connection_manager, _) =
            setup_all("test_report_translations", MockDataInserts::none()).await;

        let translation_service = ServiceProvider::new(connection_manager).translations_service;

        let mut templates = HashMap::new();
        templates.insert("test.html".to_string(), tera_template);

        let report = ResolvedReportDefinition {
            name: "test.html".to_string(),
            template: "test.html".to_string(),
            header: None,
            footer: None,
            queries: Vec::new(),
            templates,
            resources: HashMap::new(),
            ..Default::default()
        };

        let report_data = json!(null);

        let generated_report = generate_report(
            &report,
            report_data.clone(),
            None,
            &translation_service,
            Some("en".to_string()),
        )
        .unwrap();

        assert!(generated_report.document.contains("some text"));
        assert!(generated_report.document.contains("Name"));

        // // test generation in other languages

        let generated_report = generate_report(
            &report,
            report_data,
            None,
            &translation_service,
            Some("fr".to_string()),
        )
        .unwrap();

        assert!(generated_report.document.contains("some text"));
        assert!(generated_report.document.contains("Nom"));
    }
}

#[cfg(test)]
mod report_filter_test {

    use repository::{
        migrations::Version, mock::MockDataInserts, test_db::setup_all, EqualFilter, ReportFilter,
        ReportRepository,
    };

    use crate::{report::report_service::report_filter_method, service_provider::ServiceProvider};

    // adding tests to generate reports

    #[actix_rt::test]
    async fn test_standard_report_filter_method() {
        let (_, _, connection_manager, _) = setup_all(
            "test_standard_report_filter_method",
            MockDataInserts::none().reports(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        // test standard reports
        let filter = ReportFilter::new().code(EqualFilter::equal_to("standard_report"));
        let reports = ReportRepository::new(&ctx.connection)
            .query_meta_data(Some(filter), None)
            .unwrap();

        let mut app_version = Version::from_str("2.3.00");
        let mut result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        let mut report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("2.3.5"));

        app_version = Version::from_str("2.4.00");
        result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("2.3.5"));

        app_version = Version::from_str("2.8.00");
        result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("2.8.3"));

        app_version = Version::from_str("3.2.00");
        result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("3.0.1"));

        app_version = Version::from_str("4.5.00");
        result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("3.5.1"));
    }

    #[actix_rt::test]
    async fn test_custom_report_filter_method() {
        let (_, _, connection_manager, _) = setup_all(
            "test_custom_report_filter_method",
            MockDataInserts::none().reports(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        // test standard reports
        let filter = ReportFilter::new().code(EqualFilter::equal_to("report_with_custom_option"));
        let reports = ReportRepository::new(&ctx.connection)
            .query_meta_data(Some(filter), None)
            .unwrap();

        let mut app_version = Version::from_str("2.3.00");
        let mut result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        let mut report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("2.3.0"));

        app_version = Version::from_str("2.4.00");
        result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("2.3.0"));

        app_version = Version::from_str("2.8.00");
        result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("2.8.2"));

        app_version = Version::from_str("3.2.00");
        result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("2.8.2"));

        app_version = Version::from_str("4.5.00");
        result = report_filter_method(reports.clone(), app_version);
        assert_eq!(result.len(), 1);
        report = reports
            .clone()
            .into_iter()
            .filter(|r| r.id == result.clone().into_iter().next().unwrap())
            .next()
            .unwrap();
        assert_eq!(report.version, Version::from_str("2.8.2"));
    }
}
