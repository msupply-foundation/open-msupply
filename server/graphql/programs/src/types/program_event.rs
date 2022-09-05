use async_graphql::*;
use chrono::{DateTime, Utc};

use repository::ProgramEventRow;

pub struct ProgramEventNode {
    pub row: ProgramEventRow,
}

#[Object]
impl ProgramEventNode {
    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.row.datetime, Utc)
    }

    pub async fn context(&self) -> &str {
        &self.row.context
    }

    pub async fn group(&self) -> &Option<String> {
        &self.row.group
    }

    pub async fn name(&self) -> &Option<String> {
        &self.row.name
    }

    pub async fn r#type(&self) -> &str {
        &self.row.r#type
    }
}
