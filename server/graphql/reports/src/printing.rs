use async_graphql::*;
use graphql_core::simple_generic_errors::RecordNotFound;

pub struct InvalidReport;
#[Object]
impl InvalidReport {
    pub async fn description(&self) -> &'static str {
        "Report exist but is invalid"
    }
}

pub struct FailedToFetchReportData;
#[Object]
impl FailedToFetchReportData {
    pub async fn description(&self) -> &'static str {
        "Failed to query data required for the report"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum PrintReportErrorInterface {
    /// No report found with the specified report id
    ReportNotFound(RecordNotFound),
    InvalidReport(InvalidReport),
    FailedToFetchReportData(FailedToFetchReportData),
}

#[derive(SimpleObject)]
pub struct PrintReportError {
    pub error: PrintReportErrorInterface,
}

#[derive(PartialEq, Debug)]
pub struct PrintReportNode {}

#[Object]
impl PrintReportNode {
    /// Return the file id of the printed report.
    /// The file can be fetched using the /files?id={id} endpoint
    pub async fn file_id(&self) -> &str {
        "demofile0123456789"
    }
}

#[derive(Union)]
pub enum PrintReportResponse {
    Error(PrintReportError),
    Response(PrintReportNode),
}
