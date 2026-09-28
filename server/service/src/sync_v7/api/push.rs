use super::{ApiResponse, SyncApiV7};
use crate::sync_v7::sync::SyncBatchV7;

pub type Response = ApiResponse<i64>;
pub type Input = SyncBatchV7;
static ROUTE: &str = "push";

impl SyncApiV7 {
    pub async fn push(&self, input: Input) -> Response {
        // Not retried on a dropped body: central may have integrated the batch and only the
        // acknowledgement was lost. The push cursor only advances on success, so the next
        // sync re-pushes the batch anyway.
        self.request(ROUTE, input).await
    }
}
