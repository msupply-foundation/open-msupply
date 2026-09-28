use super::{ApiResponse, SyncApiV7};
use crate::sync_v7::sync::SyncBatchV7;

pub type Response = ApiResponse<i64>;
pub type Input = SyncBatchV7;
static ROUTE: &str = "push";

impl SyncApiV7 {
    pub async fn push(&self, input: Input) -> Response {
        // Safe to send twice: central appends the batch to its sync buffer again, and
        // integration keeps only the newest row per record. A re-sent final batch can find
        // central already integrating it and fail with `IntegrationInProgress`; the push
        // cursor hasn't advanced, so the next sync re-pushes it.
        self.request_with_body_retry(ROUTE, input).await
    }
}
