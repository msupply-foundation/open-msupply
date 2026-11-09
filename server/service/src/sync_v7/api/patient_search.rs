use repository::PatientFilter;

use super::{ApiResponse, SyncApiV7};
use crate::apis::patient_v4::PatientV4;

pub type Input = PatientFilter;
pub type Output = Vec<PatientV4>;
pub type Response = ApiResponse<Output>;

static ROUTE: &str = "patient_search";

impl SyncApiV7 {
    pub async fn patient_search(&self, input: Input) -> Response {
        self.request_with_body_retry(ROUTE, input).await
    }
}
