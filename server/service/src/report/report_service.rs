use chrono::{DateTime, Utc};
use fast_scraper::{Html, Selector};
use headless_chrome::browser::tab::element;
use repository::{
    EqualFilter, PaginationOption, Report, ReportFilter, ReportRepository, ReportRowRepository,
    ReportSort, ReportType, RepositoryError,
};
use std::{cell, collections::HashMap, time::SystemTime};
use util::uuid::uuid;

use crate::{
    get_default_pagination,
    service_provider::ServiceContext,
    static_files::{StaticFileCategory, StaticFileService},
    ListError,
};

use super::{
    default_queries::get_default_gql_query,
    definition::{
        GraphQlQuery, ReportDefinition, ReportDefinitionEntry, ReportRef, SQLQuery, TeraTemplate,
    },
    // excel_printing::html_to_excel,
    html_printing::html_to_pdf,
};

pub enum PrintFormat {
    Pdf,
    Html,
    Excel,
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
}

#[derive(Debug, Clone)]
pub enum ResolvedReportQuery {
    SQLQuery(SQLQuery),
    /// Custom http query
    GraphQlQuery(GraphQlQuery),
}

/// Resolved and validated report definition, i.e. its guaranteed that there is a main template and
/// query present that can be rendered
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
}

pub struct GeneratedReport {
    pub document: String,
    pub header: Option<String>,
    pub footer: Option<String>,
}

pub trait ReportServiceTrait: Sync + Send {
    fn get_report(&self, ctx: &ServiceContext, id: &str) -> Result<Report, RepositoryError> {
        get_report(ctx, id)
    }

    fn query_reports(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<ReportFilter>,
        sort: Option<ReportSort>,
    ) -> Result<Vec<Report>, ListError> {
        query_reports(ctx, pagination, filter, sort)
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
    ) -> Result<String, ReportError> {
        let document = generate_report(report, report_data, arguments)?;

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

/// Converts the report to an Excel file and returns the file id
fn print_html_report_to_excel(
    base_dir: &Option<String>,
    document: GeneratedReport,
    report_name: String,
) -> Result<String, ReportError> {
    let sheet_name = "Report";

    let mut book = umya_spreadsheet::new_file();
    let _ = book
        .set_sheet_name(0, sheet_name)
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;

    let fragment = Html::parse_fragment(&format_html_document(document));
    let container_selector = Selector::parse(r#"div[class="container"]"#).unwrap();
    let table_head_selector = Selector::parse("thead").unwrap();
    let table_body_selector = Selector::parse("tbody").unwrap();
    let row_selector = Selector::parse("tr").unwrap();
    let cell_selector = Selector::parse("td").unwrap();

    let container = fragment.select(&container_selector).next().unwrap();
    let header = container.select(&table_head_selector).next().unwrap();
    let header_row = header.select(&row_selector).next().unwrap();
    for cell in header_row.select(&cell_selector).enumerate() {
        book.get_sheet_by_name_mut(sheet_name)
            .unwrap()
            .get_cell_mut((cell.0 as u32 + 1, 1))
            .set_value(cell.1.inner_html());
        book.get_sheet_by_name_mut(sheet_name)
            .unwrap()
            .get_cell_mut((cell.0 as u32 + 1, 1))
            .get_style_mut()
            .get_font_mut()
            .set_bold(true);
    }

    let table_body = container.select(&table_body_selector).next().unwrap();
    for row in table_body.select(&row_selector).enumerate() {
        for cell in row.1.select(&cell_selector).enumerate() {
            book.get_sheet_by_name_mut(sheet_name)
                .unwrap()
                .get_cell_mut((cell.0 as u32 + 1, row.0 as u32 + 2))
                .set_value(cell.1.inner_html());
        }
    }

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

fn get_report(ctx: &ServiceContext, id: &str) -> Result<Report, RepositoryError> {
    ReportRepository::new(&ctx.connection)
        .query_by_filter(ReportFilter::new().id(EqualFilter::equal_to(id)))?
        .pop()
        .ok_or(RepositoryError::NotFound)
}

fn query_reports(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<ReportFilter>,
    sort: Option<ReportSort>,
) -> Result<Vec<Report>, ListError> {
    let repo = ReportRepository::new(&ctx.connection);
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let filter = filter
        .unwrap_or_default()
        .r#type(ReportType::OmSupply.equal_to());
    Ok(repo.query(pagination, Some(filter.clone()), sort)?)
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
    })
}

fn generate_report(
    report: &ResolvedReportDefinition,
    report_data: serde_json::Value,
    arguments: Option<serde_json::Value>,
) -> Result<GeneratedReport, ReportError> {
    let mut context = tera::Context::new();
    context.insert("data", &report_data);
    context.insert("res", &report.resources);
    if let Some(arguments) = arguments {
        context.insert("arguments", &arguments);
    }
    let mut tera = tera::Tera::default();
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
        ReportError::DocGenerationError(format!("Failed to add templates: {}", err))
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
            _ => None,
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

#[cfg(test)]
mod report_service_test {
    use std::collections::HashMap;

    use repository::{
        mock::MockDataInserts, test_db::setup_all, ContextType, ReportRow, ReportRowRepository,
        ReportType,
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
                header: None,
                footer: Some("footer.html".to_string()),
                query: vec!["query".to_string()],
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
            r#type: ReportType::OmSupply,
            template: serde_json::to_string(&report_1).unwrap(),
            context: ContextType::InboundShipment,
            comment: None,
            sub_context: None,
            argument_schema_id: None,
        })
        .unwrap();
        repo.upsert_one(&ReportRow {
            id: "report_base_1".to_string(),
            name: "Report base 1".to_string(),
            r#type: ReportType::OmSupply,
            template: serde_json::to_string(&report_base_1).unwrap(),
            context: ContextType::Resource,
            comment: None,
            sub_context: None,
            argument_schema_id: None,
        })
        .unwrap();

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context("store_id".to_string(), "".to_string())
            .unwrap();
        let service = service_provider.report_service;
        let resolved_def = service.resolve_report(&context, "report_1").unwrap();

        let doc = generate_report(
            &resolved_def,
            serde_json::json!({
                "test": "Hello"
            }),
            None,
        )
        .unwrap();
        assert_eq!(doc.document, "Template: Hello Footer");
    }
}
