use serde::{Deserialize, Serialize};

use super::{ApiResponse, SyncApiV7};
use crate::sync_v7::sync::SyncBatchV7;

pub type Response = ApiResponse<Output>;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Input {
    pub cursor: i64,
    pub batch_size: u32,
    pub patient_id: String,
    pub store_id: String,
    pub name_store_join_id: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Output {
    #[serde(flatten)]
    pub batch: SyncBatchV7,
    pub name_store_join_id: Option<String>,
}

static ROUTE: &str = "patient_data_for_site";

impl SyncApiV7 {
    pub async fn patient_data_for_site(&self, input: Input) -> Response {
        self.op(ROUTE, input).await
    }
}
