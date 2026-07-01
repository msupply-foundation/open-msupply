use repository::ChangelogCondition;
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
    /// Extra filter ANDed onto the central server's standard pull filter
    /// (`all_data_for_site`). Sent only by callers that want to scope pull to
    /// a specific slice (auxiliary sync). Defaults to None for backwards
    /// compatibility with older clients.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filter: Option<ChangelogCondition::Inner>,
}

static ROUTE: &str = "pull";

impl SyncApiV7 {
    pub async fn pull(&self, input: Input) -> Response {
        self.op(ROUTE, input).await
    }
}
