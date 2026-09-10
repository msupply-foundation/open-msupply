use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use repository::{EqualFilter, PeriodScheduleFilter, PeriodScheduleRow};
use service::ListResult;

pub struct PeriodScheduleRowNode {
    period_schedule: PeriodScheduleRow,
}

#[derive(SimpleObject)]
pub struct PeriodScheduleRowConnector {
    pub nodes: Vec<PeriodScheduleRowNode>,
    pub total_count: u32,
}

#[derive(Union)]
pub enum PeriodScheduleRowResponse {
    Response(PeriodScheduleRowConnector),
}

#[Object]
impl PeriodScheduleRowNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }
}

impl PeriodScheduleRowNode {
    pub fn from_domain(period_schedule: PeriodScheduleRow) -> PeriodScheduleRowNode {
        PeriodScheduleRowNode { period_schedule }
    }

    pub fn row(&self) -> &PeriodScheduleRow {
        &self.period_schedule
    }
}

impl PeriodScheduleRowConnector {
    pub fn from_domain(schedules: ListResult<PeriodScheduleRow>) -> PeriodScheduleRowConnector {
        PeriodScheduleRowConnector {
            nodes: schedules
                .rows
                .into_iter()
                .map(PeriodScheduleRowNode::from_domain)
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
