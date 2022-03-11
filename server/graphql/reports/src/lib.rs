use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use printing::{PrintReportNode, PrintReportResponse};
use reports::{reports, ReportFilterInput, ReportSortInput, ReportsResponse};

mod printing;
mod reports;

#[derive(Default, Clone)]
pub struct ReportQueries;

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
        reports(ctx, &store_id, page, filter, sort)
    }

    /// Creates a printed report.
    ///
    /// All details about the report, e.g. the output format, are specified in the report definition
    /// which is referred to by the report_id.
    /// The printed report can be retrieved from the `/files` endpoint using the returned file id.
    pub async fn print_report(
        &self,
        _ctx: &Context<'_>,
        _store_id: String,
        #[graphql(desc = "The id of the report to be printed")] _report_id: String,
        #[graphql(
            desc = "The data id that should be used for the report, e.g. the invoice id when printing an invoice"
        )]
        _data_id: String,
    ) -> Result<PrintReportResponse> {
        Ok(PrintReportResponse::Response(PrintReportNode {}))
    }
}
