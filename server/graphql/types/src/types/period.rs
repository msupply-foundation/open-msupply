use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::generic_filters::DateFilterInput;
use repository::{DateFilter, PeriodFilter, PeriodRow};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct PeriodNode {
    period: PeriodRow,
}

#[derive(SimpleObject)]
pub struct PeriodConnector {
    pub nodes: Vec<PeriodNode>,
    pub total_count: u32,
}

#[derive(Union)]
pub enum PeriodsResponse {
    Response(PeriodConnector),
}

#[Object]
impl PeriodNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn start_date(&self) -> &NaiveDate {
        &self.row().start_date
    }

    pub async fn end_date(&self) -> &NaiveDate {
        &self.row().end_date
    }
}

impl PeriodNode {
    pub fn from_domain(period: PeriodRow) -> PeriodNode {
        PeriodNode { period }
    }

    pub fn row(&self) -> &PeriodRow {
        &self.period
    }
}

impl PeriodConnector {
    pub fn from_domain(periods: ListResult<PeriodRow>) -> PeriodConnector {
        PeriodConnector {
            nodes: periods
                .rows
                .into_iter()
                .map(PeriodNode::from_domain)
                .collect(),
            total_count: periods.count,
        }
    }
}

#[derive(InputObject)]
pub struct PeriodFilterInput {
    pub start_date: Option<DateFilterInput>,
    pub end_date: Option<DateFilterInput>,
}

impl PeriodFilterInput {
    pub fn to_domain(self) -> PeriodFilter {
        PeriodFilter {
            end_date: self.end_date.map(DateFilter::from),
            start_date: self.start_date.map(DateFilter::from),
            id: None,
            period_schedule_id: None,
            rnr_form_program_id: None,
        }
    }
}
