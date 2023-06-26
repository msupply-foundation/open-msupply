use async_graphql::*;
use chrono::{DateTime, Utc};

use repository::ProgramEventRow;

pub struct ProgramEventNode {
    pub row: ProgramEventRow,
}

#[Object]
impl ProgramEventNode {
    pub async fn patient_id(&self) -> &Option<String> {
        &self.row.patient_id
    }

    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.row.datetime, Utc)
    }

    pub async fn active_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.row.active_start_datetime, Utc)
    }

    pub async fn document_type(&self) -> &str {
        &&self.row.document_type
    }

    pub async fn document_name(&self) -> &Option<String> {
        &self.row.document_name
    }

    pub async fn data(&self) -> &Option<String> {
        &self.row.data
    }

    pub async fn r#type(&self) -> &str {
        &self.row.r#type
    }
}
