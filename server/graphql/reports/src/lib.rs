use async_graphql::*;
use graphql_core::{generic_inputs::PrintReportSortInput, pagination::PaginationInput};
use printing::{print_report, print_report_definition, PrintReportResponse};
use reports::{reports, ReportFilterInput, ReportSortInput, ReportsResponse};
use service::report::report_service::PrintFormat as ServicePrintFormat;

mod printing;
mod reports;

#[derive(Default, Clone)]
pub struct ReportQueries;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum PrintFormat {
    Pdf,
    Html,
}

#[Object]
impl ReportQueries {
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

    /// Creates a printed report.
    ///
    /// All details about the report, e.g. the output format, are specified in the report definition
    /// which is referred to by the report_id.
    /// The printed report can be retrieved from the `/files` endpoint using the returned file id.
    pub async fn print_report(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "The id of the report to be printed")] _report_id: String,
        report_id: String,
        #[graphql(
            desc = "The data id that should be used for the report, e.g. the invoice id when printing an invoice"
        )]
        data_id: Option<String>,
        arguments: Option<serde_json::Value>,
        format: Option<PrintFormat>,
        sort: Option<PrintReportSortInput>,
    ) -> Result<PrintReportResponse> {
        print_report(
            ctx,
            store_id,
            report_id,
            data_id,
            arguments,
            format.into(),
            sort,
        )
        .await
    }

    /// Can be used when developing reports, e.g. to print a report that is not already in the
    /// system.
    pub async fn print_report_definition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Name of the report")] name: Option<String>,
        #[graphql(desc = "The report definition to be printed")] report: serde_json::Value,
        data_id: Option<String>,
        arguments: Option<serde_json::Value>,
        format: Option<PrintFormat>,
    ) -> Result<PrintReportResponse> {
        print_report_definition(ctx, store_id, name, report, data_id, arguments, format).await
    }
}

impl PrintFormat {
    fn to_domain(self) -> ServicePrintFormat {
        match self {
            PrintFormat::Pdf => ServicePrintFormat::Pdf,
            PrintFormat::Html => ServicePrintFormat::Html,
        }
    }
}
