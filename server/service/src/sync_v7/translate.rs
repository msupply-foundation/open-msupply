use repository::{syncv7::Upsert, SyncBufferRow, SyncBufferV7Row};
use thiserror::Error;

use crate::sync_v7::serde::deserialize;

#[derive(Debug, Error)]
pub(crate) enum TranslationError {
    #[error("No translator found for this sync record")]
    TranslatorNotFound,
    #[error(transparent)]
    SerdeError(serde_json::Error),
}

pub(crate) fn translate(row: &SyncBufferV7Row) -> Result<Box<dyn Upsert>, TranslationError> {
    match deserialize(&row.table_name, &row.data) {
        Ok(Some(upsert)) => Ok(upsert),
        Ok(None) => Err(TranslationError::TranslatorNotFound),
        Err(e) => Err(TranslationError::SerdeError(e)),
    }
}
