use std::collections::HashMap;

use repository::RepositoryError;

use crate::service_provider::ServiceContext;

use super::{
    html_printing::html_to_pdf, DefaultQuery, ReportDefinition, ReportDefinitionEntry,
    ReportHttpQuery, ReportRef,
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
    Http(ReportHttpQuery),
    // Use default predefined query
    Default(DefaultQuery),
}

/// Helper trait for mocking tests
pub trait ReportServiceSupportTrait: Sync + Send {
    fn get_report_definition(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        report_id: &str,
    ) -> Result<Option<ReportDefinition>, ReportError>;

    fn run_query(
        &self,
        ctx: &ServiceContext,
        query: ResolvedReportQuery,
    ) -> Result<serde_json::Value, ReportError>;
}

pub trait ReportServiceTrait: Sync + Send {
    fn generate_report(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        report_id: &str,
    ) -> Result<String, ReportError>;

    fn print_report(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        report_id: &str,
    ) -> Result<Vec<u8>, ReportError> {
        let document = self.generate_report(ctx, store_id, report_id)?;
        let pdf = html_to_pdf(&document)
            .map_err(|err| ReportError::HTMLToPDFError(format!("{}", err)))?;

        Ok(pdf)
    }
}

fn generate_tera_html_report(
    service: &dyn ReportServiceSupportTrait,
    ctx: &ServiceContext,
    store_id: &str,
    report_id: &str,
) -> Result<String, ReportError> {
    let resolved_report = resolve_template_definition(service, ctx, store_id, report_id)?;
    let query =
        query_from_resolved_template(&resolved_report).ok_or(ReportError::QueryNotSpecified)?;
    let templates = template_from_resolved_template(&resolved_report)
        .ok_or(ReportError::TemplateNotSpecified)?;

    let resources = resources_from_resolved_template(&resolved_report);

    let data = service.run_query(ctx, query)?;

    let mut context = tera::Context::new();
    context.insert("data", &data);
    context.insert("res", &resources);
    let mut tera = tera::Tera::default();
    tera.add_raw_templates(templates.iter()).map_err(|err| {
        ReportError::DocGenerationError(format!("Failed to add templates: {}", err))
    })?;
    let document = tera
        .render(TEMPLATE_KEY, &context)
        .map_err(|err| ReportError::DocGenerationError(format!("{}", err)))?;

    Ok(document)
}

const TEMPLATE_KEY: &'static str = "template";
const QUERY_KEY: &'static str = "query";

fn template_from_resolved_template(report: &ReportDefinition) -> Option<HashMap<String, String>> {
    // validate that the main template is present
    report.entries.get(TEMPLATE_KEY)?;

    let mut templates = HashMap::new();
    for (name, entry) in &report.entries {
        match entry {
            ReportDefinitionEntry::TeraTemplate(template) => {
                templates.insert(name.clone(), template.template.clone());
            }
            _ => {}
        }
    }
    Some(templates)
}

fn query_from_resolved_template(report: &ReportDefinition) -> Option<ResolvedReportQuery> {
    let query = report.entries.get(QUERY_KEY)?;
    let query = match query {
        ReportDefinitionEntry::QueryHttp(query) => ResolvedReportQuery::Http(query.clone()),
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

fn resolve_template_definition(
    service: &dyn ReportServiceSupportTrait,
    ctx: &ServiceContext,
    store_id: &str,
    report_id: &str,
) -> Result<ReportDefinition, ReportError> {
    let main = match service.get_report_definition(ctx, store_id, report_id)? {
        Some(main) => main,
        None => {
            return Err(ReportError::ReportDefinitionNotFound {
                report_id: report_id.to_string(),
                msg: "Can't find root report".to_string(),
            })
        }
    };

    let mut out = ReportDefinition {
        entries: HashMap::new(),
    };
    for (name, entry) in main.entries {
        match entry {
            ReportDefinitionEntry::Ref(reference) => {
                let resolved_ref = resolve_ref(service, ctx, store_id, &name, &reference)?;
                out.entries.insert(name, resolved_ref)
            }
            _ => out.entries.insert(name, entry),
        };
    }
    Ok(out)
}

fn resolve_ref(
    service: &dyn ReportServiceSupportTrait,
    ctx: &ServiceContext,
    store_id: &str,
    ref_name: &str,
    ref_entry: &ReportRef,
) -> Result<ReportDefinitionEntry, ReportError> {
    let mut ref_report = service
        .get_report_definition(ctx, store_id, &ref_entry.source)?
        .ok_or(ReportError::InvalidReportDefinition(format!(
            "Invalid reference {}",
            ref_entry.source
        )))?;
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

#[cfg(test)]
mod report_service_test {
    use std::collections::HashMap;

    use repository::{mock::MockDataInserts, test_db::setup_all};
    use serde_json::json;

    use crate::{
        report::{
            DefaultQuery, ReportDefinition, ReportDefinitionEntry, ReportOutputType, ReportRef,
            TeraTemplate,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use super::{
        generate_tera_html_report, ReportError, ReportServiceSupportTrait, ResolvedReportQuery,
    };

    struct MockService {
        // report_id -> (entry_id -> Entry)
        pub reports: HashMap<String, HashMap<String, ReportDefinitionEntry>>,
    }
    impl ReportServiceSupportTrait for MockService {
        fn get_report_definition(
            &self,
            _ctx: &ServiceContext,
            _store_id: &str,
            report_id: &str,
        ) -> Result<Option<ReportDefinition>, ReportError> {
            Ok(self.reports.get(report_id).map(|entries| ReportDefinition {
                entries: entries.clone(),
            }))
        }

        fn run_query(
            &self,
            _ctx: &ServiceContext,
            _query: ResolvedReportQuery,
        ) -> Result<serde_json::Value, ReportError> {
            Ok(json!({
                "test": "Hello",
            }))
        }
    }

    #[actix_rt::test]
    async fn generate_tera_html_document() {
        let mock_service = MockService {
            reports: HashMap::from([
                (
                    "report_1".to_string(),
                    HashMap::from([
                        (
                            "template".to_string(),
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
                            ReportDefinitionEntry::DefaultQuery(DefaultQuery::OutboundShipment),
                        ),
                    ]),
                ),
                (
                    "report_base_1".to_string(),
                    HashMap::from([(
                        "footer.html".to_string(),
                        ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                            output: ReportOutputType::Html,
                            template: "{% block footer %}Footer{% endblock footer %}".to_string(),
                        }),
                    )]),
                ),
            ]),
        };
        let (_, _, connection_manager, _) =
            setup_all("generate_tera_html_document", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let doc =
            generate_tera_html_report(&mock_service, &context, "store_id", "report_1").unwrap();

        assert_eq!(doc, "Template: Hello Footer");
    }
}
