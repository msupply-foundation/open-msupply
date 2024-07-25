use async_graphql::*;
use chrono::{DateTime, Utc};
use repository::{NameRow, PeriodRow, ProgramRow, RnRForm, RnRFormRow};

pub struct RnRFormNode {
    pub rnr_form_row: RnRFormRow,
    pub program_row: ProgramRow,
    pub period_row: PeriodRow,
    pub supplier_row: NameRow,
}

#[Object]
impl RnRFormNode {
    pub async fn id(&self) -> &str {
        &self.rnr_form_row.id
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.rnr_form_row.created_datetime, Utc)
    }

    pub async fn program_id(&self) -> &str {
        &self.rnr_form_row.program_id
    }

    pub async fn supplier_name(&self) -> &str {
        &self.supplier_row.name
    }

    pub async fn program_name(&self) -> &str {
        &self.program_row.name
    }

    pub async fn period_id(&self) -> &str {
        &self.rnr_form_row.period_id
    }

    pub async fn period_name(&self) -> &str {
        &self.period_row.name
    }
}

impl RnRFormNode {
    pub fn from_domain(form: RnRForm) -> RnRFormNode {
        let RnRForm {
            rnr_form_row,
            name_row,
            period_row,
            program_row,
            store_row: _,
        } = form;

        RnRFormNode {
            rnr_form_row,
            program_row,
            period_row,
            supplier_row: name_row,
        }
    }
}
