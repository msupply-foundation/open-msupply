use async_graphql::*;
use chrono::NaiveDate;

pub struct RnRFormNode {
    // pub program_row: ProgramRow,
}

#[Object]
impl RnRFormNode {
    pub async fn id(&self) -> &str {
        "id"
        // &self.row.id
    }

    pub async fn created_date(&self) -> Option<NaiveDate> {
        NaiveDate::from_ymd_opt(2024, 07, 16)
        // &self.row().created_date
    }

    pub async fn program_id(&self, ctx: &Context<'_>) -> &str {
        "program_id"
    }

    pub async fn program_name(&self, ctx: &Context<'_>) -> &str {
        "program_name"
    }

    pub async fn period_id(&self, ctx: &Context<'_>) -> &str {
        "period_id"
    }

    pub async fn period_name(&self, ctx: &Context<'_>) -> &str {
        "period_name"
    }
}
