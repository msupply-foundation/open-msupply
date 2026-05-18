use chrono::Utc;
use repository::{SyncMessageRow, SyncMessageRowStatus};

use crate::sync_message::insert::InsertSyncMessageInput;

pub fn generate(input: InsertSyncMessageInput, from_store_id: String) -> SyncMessageRow {
    let InsertSyncMessageInput {
        id,
        to_store_id,
        body,
        r#type,
    } = input;

    let created_datetime = Utc::now().naive_utc();

    SyncMessageRow {
        id,
        to_store_id,
        from_store_id: Some(from_store_id),
        body: body.unwrap_or_default(),
        r#type,
        status: SyncMessageRowStatus::New,
        created_datetime,
        // Defaults
        error_message: None,
    }
}
