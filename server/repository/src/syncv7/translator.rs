use util::format_error;

use crate::{ChangelogTableName, StorageConnection};

use super::*;

pub trait TranslatorTrait {
    type Item: SyncRecord + Upsert + 'static;
}

impl<T: TranslatorTrait + Sync + Send> BoxableSyncRecord for T {
    fn serialize(
        &self,
        connection: &StorageConnection,
        table_name: &ChangelogTableName,
        id: &str,
    ) -> Result<Option<serde_json::Value>, SyncRecordSerializeError> {
        if T::Item::table_name() != table_name {
            return Ok(None);
        };

        let Some(record) = T::Item::find_by_id(connection, id)? else {
            return Err(SyncRecordSerializeError::RecordNotFound {
                id: id.to_string(),
                table: table_name.clone(),
            });
        };

        let result =
            serde_json::to_value(&record).map_err(|e| SyncRecordSerializeError::SerdeError {
                table_name: table_name.clone(),
                id: id.to_string(),
                e: format_error(&e),
            })?;

        Ok(Some(result))
    }

    fn deserialize(
        &self,
        table_name: &ChangelogTableName,
        value: &serde_json::Value,
    ) -> Result<Option<Box<dyn Upsert>>, serde_json::Error> {
        if T::Item::table_name() != table_name {
            return Ok(None);
        };

        let record: T::Item = serde_json::from_value(value.to_owned())?;

        Ok(Some(record.boxed()))
    }

    fn sync_type(&self) -> &'static SyncType {
        <T::Item as SyncRecord>::sync_type()
    }

    fn table_name(&self) -> ChangelogTableName {
        T::Item::table_name().to_owned()
    }
}
