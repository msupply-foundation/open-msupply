use std::collections::HashMap;

use repository::{
    schema::report::{ReportRow, ReportType},
    PaginationOption, ReportFilter, ReportRepository, ReportRowRepository, ReportSort,
    RepositoryError,
};
use util::uuid::uuid;

use crate::{
    get_default_pagination, service_provider::ServiceContext, static_files::StaticFileService,
    ListError,
};

use super::{
    default_queries::get_default_gql_query,
    definition::{
        DefaultQuery, GraphQlQuery, ReportDefinition, ReportDefinitionEntry, ReportRef,
        TeraTemplate,
    },
    dummy_reports::insert_dummy_reports,
    html_printing::html_to_pdf,
};

#[derive(Debug)]
pub enum ReportError {
    RepositoryError(RepositoryError),
    ReportDefinitionNotFound { report_id: String, msg: String },
    TemplateNotSpecified,
    QueryNotSpecified,
    InvalidReportDefinition(String),
    QueryError(String),
    DocGenerationError(String),
    HTMLToPDFError(String),
}

pub enum ResolvedReportQuery {
    /// Custom http query
    GraphQlQuery(GraphQlQuery),
    // Use default predefined query
    Default(DefaultQuery),
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
    pub query: GraphQlQuery,
    pub resources: HashMap<String, serde_json::Value>,
}

pub struct GeneratedReport {
    pub document: String,
    pub header: Option<String>,
    pub footer: Option<String>,
}

pub trait ReportServiceTrait: Sync + Send {
    fn query_reports(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<ReportFilter>,
        sort: Option<ReportSort>,
    ) -> Result<Vec<ReportRow>, ListError> {
        query_reports(ctx, pagination, filter, sort)
    }

    fn resolve_report(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        report_id: &str,
    ) -> Result<ResolvedReportDefinition, ReportError> {
        resolve_report(ctx, store_id, report_id)
    }

    fn generate_report(
        &self,
        report: &ResolvedReportDefinition,
        report_data: serde_json::Value,
    ) -> Result<GeneratedReport, ReportError> {
        generate_report(report, report_data)
    }

    /// Returns the printed pdf file id
    fn print_report(
        &self,
        report: &ResolvedReportDefinition,
        report_data: serde_json::Value,
    ) -> Result<String, ReportError> {
        let document = self.generate_report(report, report_data)?;
        let id = uuid();
        let pdf = html_to_pdf(&document, &id)
            .map_err(|err| ReportError::HTMLToPDFError(format!("{}", err)))?;

        let file_service = StaticFileService::new();
        let file = file_service
            .store_file(&format!("{}.pdf", report.name), &pdf)
            .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;
        Ok(file.id)
    }
}

pub struct ReportService;
impl ReportServiceTrait for ReportService {}

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

fn query_reports(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<ReportFilter>,
    sort: Option<ReportSort>,
) -> Result<Vec<ReportRow>, ListError> {
    let repo = ReportRepository::new(&ctx.connection);

    // TODO remove when reports are loaded through other means:
    if repo.count(None)? == 0 {
        insert_dummy_reports(&ctx.connection)?;
    }

    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let filter = filter
        .unwrap_or(ReportFilter::new())
        .r#type(ReportType::OmReport.equal_to());
    Ok(repo.query(pagination, Some(filter.clone()), sort)?)
}

fn resolve_report(
    ctx: &ServiceContext,
    store_id: &str,
    report_id: &str,
) -> Result<ResolvedReportDefinition, ReportError> {
    let repo = ReportRowRepository::new(&ctx.connection);

    let (name, resolved_report) = resolve_template_definition(&repo, store_id, report_id)?;
    let templates = tera_templates_from_resolved_template(&resolved_report)
        .ok_or(ReportError::TemplateNotSpecified)?;

    // validate index entries are present
    let template =
        resolved_report
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
    if let Some(header) = resolved_report.index.header.clone() {
        if !templates.contains_key(&header) {
            return Err(ReportError::InvalidReportDefinition(format!(
                "Invalid template header reference: {}",
                header
            )));
        }
    }
    if let Some(footer) = resolved_report.index.footer.clone() {
        if !templates.contains_key(&footer) {
            return Err(ReportError::InvalidReportDefinition(format!(
                "Invalid template footer reference: {}",
                footer
            )));
        }
    }
    let query = resolved_report
        .index
        .query
        .clone()
        .ok_or(ReportError::InvalidReportDefinition(
            "Query reference missing".to_string(),
        ))?;
    let query_entry = match resolved_report.entries.get(&query) {
        Some(query_entry) => query_entry,
        None => {
            return Err(ReportError::InvalidReportDefinition(format!(
                "Invalid query reference: {}",
                query
            )))
        }
    };

    // resolve the query entry
    let query = query_from_resolved_template(query_entry).ok_or(ReportError::QueryNotSpecified)?;
    let query = match query {
        ResolvedReportQuery::GraphQlQuery(query) => query,
        ResolvedReportQuery::Default(query) => get_default_gql_query(query),
    };

    let resources = resources_from_resolved_template(&resolved_report);

    Ok(ResolvedReportDefinition {
        name,
        template,
        header: resolved_report.index.header.clone(),
        footer: resolved_report.index.footer.clone(),
        templates,
        query,
        resources,
    })
}

fn generate_report(
    report: &ResolvedReportDefinition,
    report_data: serde_json::Value,
) -> Result<GeneratedReport, ReportError> {
    let mut context = tera::Context::new();
    context.insert("data", &report_data);
    context.insert("res", &report.resources);
    let mut tera = tera::Tera::default();
    let templates: HashMap<String, String> = report
        .templates
        .iter()
        .map(|(name, template)| (name.to_string(), template.template.to_string()))
        .collect();
    tera.add_raw_templates(templates.iter()).map_err(|err| {
        ReportError::DocGenerationError(format!("Failed to add templates: {}", err))
    })?;

    let document = tera
        .render(&report.template, &context)
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;
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
        match entry {
            ReportDefinitionEntry::TeraTemplate(template) => {
                templates.insert(name.clone(), template.clone());
            }
            _ => {}
        }
    }
    Some(templates)
}

fn query_from_resolved_template(
    query_entry: &ReportDefinitionEntry,
) -> Option<ResolvedReportQuery> {
    let query = match query_entry {
        ReportDefinitionEntry::GraphGLQuery(query) => {
            ResolvedReportQuery::GraphQlQuery(query.clone())
        }
        ReportDefinitionEntry::DefaultQuery(query) => ResolvedReportQuery::Default(query.clone()),
        _ => return None,
    };
    Some(query)
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
    let def = serde_json::from_str::<ReportDefinition>(&row.data).map_err(|err| {
        ReportError::InvalidReportDefinition(format!("Can't parse report: {}", err))
    })?;
    Ok((row.name, def))
}

fn resolve_template_definition(
    repo: &ReportRowRepository,
    store_id: &str,
    report_id: &str,
) -> Result<(String, ReportDefinition), ReportError> {
    let (report_name, main) = load_report_definition(repo, report_id)?;

    let mut out = ReportDefinition {
        index: main.index.clone(),
        entries: HashMap::new(),
    };
    for (name, entry) in main.entries {
        match entry {
            ReportDefinitionEntry::Ref(reference) => {
                let resolved_ref = resolve_ref(repo, store_id, &name, &reference)?;
                out.entries.insert(name, resolved_ref)
            }
            _ => out.entries.insert(name, entry),
        };
    }
    Ok((report_name, out))
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
        mock::MockDataInserts,
        schema::report::{ReportCategory, ReportRow, ReportType},
        test_db::setup_all,
        ReportRowRepository,
    };

    use crate::{
        report::definition::{
            DefaultQuery, ReportDefinition, ReportDefinitionEntry, ReportDefinitionIndex,
            ReportOutputType, ReportRef, TeraTemplate,
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
                query: Some("query".to_string()),
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
                query: None,
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
            r#type: ReportType::OmReport,
            data: serde_json::to_string(&report_1).unwrap(),
            context: ReportCategory::Invoice,
        })
        .unwrap();
        repo.upsert_one(&ReportRow {
            id: "report_base_1".to_string(),
            name: "Report base 1".to_string(),
            r#type: ReportType::OmReport,
            data: serde_json::to_string(&report_base_1).unwrap(),
            context: ReportCategory::Resource,
        })
        .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.report_service;
        let resolved_def = service
            .resolve_report(&context, "store_id", "report_1")
            .unwrap();

        let doc = service
            .generate_report(
                &resolved_def,
                serde_json::json!({
                    "test": "Hello"
                }),
            )
            .unwrap();
        assert_eq!(doc.document, "Template: Hello Footer");
    }
}
