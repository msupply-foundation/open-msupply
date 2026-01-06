use repository::{
    syncv7::{SyncRecordSerializeError, Upsert, SYNC_VISITORS},
    ChangelogTableName, StorageConnection,
};

pub fn serialize(
    connection: &StorageConnection,
    changelog: &ChangelogTableName,
    id: &str,
) -> Result<Option<serde_json::Value>, SyncRecordSerializeError> {
    let visitors = SYNC_VISITORS.read().unwrap();
    for visitor in visitors.iter() {
        if let Some(value) = visitor.serialize(connection, changelog, id)? {
            return Ok(Some(value));
        }
    }
    Ok(None)
}

pub fn deserialize(
    table_name: &ChangelogTableName,
    value: &serde_json::Value,
) -> Result<Option<Box<dyn Upsert>>, serde_json::Error> {
    let visitors = SYNC_VISITORS.read().unwrap();
    for visitor in visitors.iter() {
        if let Some(upsert) = visitor.deserialize(table_name, value)? {
            return Ok(Some(upsert));
        }
    }
    Ok(None)
}
