use serde::{Deserialize, Serialize};

use super::{ApiResponse, SyncApiV7};

#[derive(Serialize, Deserialize)]
pub struct Output {
    pub site_id: i32,
    pub central_site_id: i32,
}

pub type Response = ApiResponse<Output>;
pub type Input = ();
pub type Request = super::Request<Input>;
static ROUTE: &str = "site_status";

impl SyncApiV7 {
    pub async fn site_status(&self, input: Input) -> Response {
        self.op(ROUTE, input).await
    }
}
