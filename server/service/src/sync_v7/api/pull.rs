use serde::{Deserialize, Serialize};

use super::{ApiResponse, SyncApiV7};
use crate::sync_v7::sync::SyncBatchV7;

pub type Response = ApiResponse<SyncBatchV7>;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Input {
    pub cursor: i64,
    pub batch_size: u32,
    pub is_initialising: bool,
}

static ROUTE: &str = "pull";

impl SyncApiV7 {
    pub async fn pull(&self, input: Input) -> Response {
        self.op(ROUTE, input).await
    }
}
