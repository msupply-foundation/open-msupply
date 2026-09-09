use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use repository::{EqualFilter, PeriodScheduleFilter, PeriodScheduleRow};
use service::ListResult;

pub struct PeriodScheduleNode {
    period_schedule: PeriodScheduleRow,
}

#[derive(SimpleObject)]
pub struct PeriodSchedulesConnector {
    pub nodes: Vec<PeriodScheduleNode>,
    pub total_count: u32,
}

#[derive(Union)]
pub enum PeriodSchedulesResponse {
    Response(PeriodSchedulesConnector),
}

#[Object]
impl PeriodScheduleNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }
}

impl PeriodScheduleNode {
    pub fn from_domain(period_schedule: PeriodScheduleRow) -> PeriodScheduleNode {
        PeriodScheduleNode { period_schedule }
    }

    pub fn row(&self) -> &PeriodScheduleRow {
        &self.period_schedule
    }
}

impl PeriodSchedulesConnector {
    pub fn from_domain(schedules: ListResult<PeriodScheduleRow>) -> PeriodSchedulesConnector {
        PeriodSchedulesConnector {
            nodes: schedules
                .rows
                .into_iter()
                .map(PeriodScheduleNode::from_domain)
                .collect(),
            total_count: schedules.count,
        }
    }
}

#[derive(InputObject)]
pub struct PeriodScheduleFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<EqualFilterStringInput>,
}

impl PeriodScheduleFilterInput {
    pub fn to_domain(self) -> PeriodScheduleFilter {
        PeriodScheduleFilter {
            id: self.id.map(EqualFilter::from),
            name: self.name.map(EqualFilter::from),
        }
    }
}
