use async_graphql::*;
use chrono::NaiveDate;
use repository::PeriodRow;

#[derive(PartialEq, Debug)]
pub struct PeriodNode {
    period: PeriodRow,
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
