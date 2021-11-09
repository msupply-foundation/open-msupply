use repository::schema::CentralSyncBufferRow;

use serde::{self, Deserialize, Serialize};
use std::fmt::{self, Debug, Display};

#[derive(Debug, Deserialize, Serialize)]
pub struct CentralSyncBatch {
    #[serde(rename = "maxCursor")]
    pub max_cursor: u32,
    pub data: Option<Vec<CentralSyncBufferRow>>,
}

impl Display for CentralSyncBatch {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
