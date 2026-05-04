use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

use super::{ApiResponse, SyncApiV7};
use crate::apis::patient_v4::PatientV4;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Input {
    pub code: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub date_of_birth: Option<NaiveDate>,
}

pub type Output = Vec<PatientV4>;
pub type Response = ApiResponse<Output>;

static ROUTE: &str = "patient_search";

impl SyncApiV7 {
    pub async fn patient_search(&self, input: Input) -> Response {
        self.op(ROUTE, input).await
    }
}
