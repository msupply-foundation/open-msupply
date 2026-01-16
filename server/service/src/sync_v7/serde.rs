use repository::{
    syncv7::{translators, SyncRecordSerializeError, Upsert},
    ChangelogTableName, StorageConnection,
};

pub fn serialize(
    connection: &StorageConnection,
    changelog: &ChangelogTableName,
    id: &str,
) -> Result<Option<serde_json::Value>, SyncRecordSerializeError> {
    for visitor in translators() {
        if let Some(value) = visitor.serialize(connection, changelog, id)? {
            return Ok(Some(value));
        }
    }
    Ok(None)
}
