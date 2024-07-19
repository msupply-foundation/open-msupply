use async_graphql::*;

use graphql_types::types::PeriodNode;
use repository::{Period, PeriodScheduleRow};
use service::rnr_form::schedules_with_periods::PeriodSchedule;

#[derive(SimpleObject)]
pub struct PeriodSchedulesConnector {
    pub total_count: u32,
    pub nodes: Vec<PeriodScheduleNode>,
}

impl PeriodSchedulesConnector {
    pub fn from_domain(schedules: Vec<PeriodSchedule>) -> PeriodSchedulesConnector {
        PeriodSchedulesConnector {
            total_count: 0, // TODO
            nodes: schedules
                .into_iter()
                .map(
                    |PeriodSchedule {
                         schedule_row,
                         periods,
                     }| PeriodScheduleNode {
                        schedule_row,
                        periods,
                    },
                )
                .collect(),
        }
    }
}

#[derive(Union)]
pub enum PeriodSchedulesResponse {
    Response(PeriodSchedulesConnector),
}

pub struct PeriodScheduleNode {
    pub schedule_row: PeriodScheduleRow,
    pub periods: Vec<Period>,
}

#[Object]
impl PeriodScheduleNode {
    pub async fn id(&self) -> &str {
        &self.schedule_row.id
    }

    pub async fn name(&self) -> &str {
        &self.schedule_row.name
    }

    pub async fn periods(&self) -> Vec<SchedulePeriodNode> {
        self.periods
            .clone()
            .into_iter()
            .map(SchedulePeriodNode::from_domain)
            .collect()
    }
}

pub struct SchedulePeriodNode {
    period: Period,
}

#[Object]
impl SchedulePeriodNode {
    pub async fn id(&self) -> &str {
        &self.period.period_row.id
    }

    pub async fn period(&self) -> PeriodNode {
        PeriodNode::from_domain(self.period.period_row.clone())
    }

    pub async fn in_use(&self) -> bool {
        self.period.rnr_form_row.is_some()
    }
}

impl SchedulePeriodNode {
    pub fn from_domain(period: Period) -> SchedulePeriodNode {
        SchedulePeriodNode { period }
    }
}
