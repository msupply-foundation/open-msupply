use super::{ApiResponse, SyncApiV7};
use crate::sync_v7::sync::SyncBatchV7;

pub type Response = ApiResponse<i64>;
pub type Input = SyncBatchV7;
static ROUTE: &str = "push";

impl SyncApiV7 {
    pub async fn push(&self, input: Input) -> Response {
        self.op(ROUTE, input).await
    }
}
