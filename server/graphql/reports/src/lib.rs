use async_graphql::*;
use generate::{generate_report, generate_report_definition, GenerateReportResponse};
use graphql_core::{generic_inputs::GenerateReportSortInput, pagination::PaginationInput};
use reports::{
    report, reports, ReportFilterInput, ReportResponse, ReportSortInput, ReportsResponse,
};
use service::report::report_service::GenerateFormat as ServiceGenerateFormat;

mod generate;
mod reports;

#[derive(Default, Clone)]
pub struct ReportQueries;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum GenerateFormat {
    Pdf,
    Html,
}

#[Object]
impl ReportQueries {
    pub async fn report(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<ReportResponse> {
        report(ctx, store_id, id)
    }

    /// Queries a list of available reports
    pub async fn reports(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<ReportFilterInput>,
        sort: Option<Vec<ReportSortInput>>,
    ) -> Result<ReportsResponse> {
        reports(ctx, store_id, page, filter, sort)
    }

    /// Creates a generated report.
    ///
    /// All details about the report, e.g. the output format, are specified in the report definition
    /// which is referred to by the report_id.
    /// The generated report can be retrieved from the `/files` endpoint using the returned file id.
    pub async fn generate_report(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "The id of the report to be generated")] _report_id: String,
        report_id: String,
        #[graphql(
            desc = "The data id that should be used for the report, e.g. the invoice id when generating an invoice"
        )]
        data_id: Option<String>,
        arguments: Option<serde_json::Value>,
        format: Option<GenerateFormat>,
        sort: Option<GenerateReportSortInput>,
    ) -> Result<GenerateReportResponse> {
        generate_report(ctx, store_id, report_id, data_id, arguments, format, sort).await
    }

    /// Can be used when developing reports, e.g. to generate a report that is not already in the
    /// system.
    pub async fn generate_report_definition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Name of the report")] name: Option<String>,
        #[graphql(desc = "The report definition to be generated")] report: serde_json::Value,
        data_id: Option<String>,
        arguments: Option<serde_json::Value>,
        format: Option<GenerateFormat>,
    ) -> Result<GenerateReportResponse> {
        generate_report_definition(ctx, store_id, name, report, data_id, arguments, format).await
    }
}

impl GenerateFormat {
    fn to_domain(self) -> ServiceGenerateFormat {
        match self {
            GenerateFormat::Pdf => ServiceGenerateFormat::Pdf,
            GenerateFormat::Html => ServiceGenerateFormat::Html,
        }
    }
}
