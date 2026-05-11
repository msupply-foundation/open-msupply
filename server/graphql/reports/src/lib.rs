use async_graphql::*;
mod mutations;
use crate::export::csv_to_excel;
use graphql_core::{generic_inputs::PrintReportSortInput, pagination::PaginationInput};
use mutations::install::install_uploaded_reports;
use print::{generate_report, generate_report_definition, PrintReportResponse};
use reports::{
    all_report_versions, report, reports, ReportFilterInput, ReportResponse, ReportSortInput,
    ReportsResponse,
};
use repository::PaginationOption;
use service::report::report_service::PrintFormat as ServicePrintFormat;

mod export;
mod print;
mod reports;

#[derive(Default, Clone)]
pub struct ReportQueries;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum PrintFormat {
    Pdf,
    Html,
    Excel,
}

#[Object]
impl ReportQueries {
    pub async fn report(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        user_language: String,
        id: String,
    ) -> Result<ReportResponse> {
        report(ctx, store_id, user_language, id)
    }

    /// Queries a list of available reports
    pub async fn reports(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        user_language: String,
        filter: Option<ReportFilterInput>,
        sort: Option<Vec<ReportSortInput>>,
    ) -> Result<ReportsResponse> {
        reports(ctx, store_id, user_language, filter, sort)
    }

    /// Queries all reports and their respective versions
    pub async fn all_report_versions(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        user_language: String,
        filter: Option<ReportFilterInput>,
        page: Option<PaginationInput>,
        sort: Option<Vec<ReportSortInput>>,
    ) -> Result<ReportsResponse> {
        all_report_versions(
            ctx,
            store_id,
            user_language,
            filter,
            sort,
            page.map(PaginationOption::from),
        )
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
        format: Option<PrintFormat>,
        sort: Option<PrintReportSortInput>,
        current_language: Option<String>,
    ) -> Result<PrintReportResponse> {
        generate_report(
            ctx,
            store_id,
            report_id,
            data_id,
            arguments,
            format,
            sort,
            current_language,
        )
        .await
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
        format: Option<PrintFormat>,
        current_language: Option<String>,
        excel_template_buffer: Option<Vec<u8>>,
    ) -> Result<PrintReportResponse> {
        generate_report_definition(
            ctx,
            store_id,
            name,
            report,
            data_id,
            arguments,
            format,
            current_language,
            excel_template_buffer,
        )
        .await
    }

    pub async fn csv_to_excel(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        csv_data: String,
        filename: String,
    ) -> Result<PrintReportResponse> {
        csv_to_excel(ctx, store_id, csv_data, filename).await
    }
}

impl PrintFormat {
    fn to_domain(self) -> ServicePrintFormat {
        match self {
            PrintFormat::Pdf => ServicePrintFormat::Pdf,
            PrintFormat::Html => ServicePrintFormat::Html,
            PrintFormat::Excel => ServicePrintFormat::Excel,
        }
    }
}

#[derive(Default, Clone)]
pub struct CentralReportMutations;

#[Object]
impl CentralReportMutations {
    pub async fn install_uploaded_reports(
        &self,
        ctx: &Context<'_>,
        file_id: String,
    ) -> Result<Vec<String>> {
        let ids = install_uploaded_reports(ctx, file_id)?;
        Ok(ids)
    }
}
