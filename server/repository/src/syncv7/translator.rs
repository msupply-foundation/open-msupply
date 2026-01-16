use crate::{
    currency_row, invoice_line_row, invoice_row, item_row, location_type_row, name_row,
    stock_line_row, store_row, unit_row, ChangelogTableName, StorageConnection,
};
use util::format_error;

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

    fn deserialize(&self, value: &serde_json::Value) -> Result<Box<dyn Upsert>, serde_json::Error> {
        let record: T::Item = serde_json::from_value(value.to_owned())?;

        Ok(record.boxed())
    }

    fn sync_type(&self) -> &'static SyncType {
        <T::Item as SyncRecord>::sync_type()
    }

    fn table_name(&self) -> ChangelogTableName {
        T::Item::table_name().to_owned()
    }
}

pub fn translators() -> Vec<Box<dyn BoxableSyncRecord>> {
    vec![
        unit_row::Translator::boxed(),
        currency_row::Translator::boxed(),
        name_row::Translator::boxed(),
        store_row::Translator::boxed(),
        location_type_row::Translator::boxed(),
        item_row::Translator::boxed(),
        stock_line_row::Translator::boxed(),
        invoice_row::Translator::boxed(),
        invoice_line_row::Translator::boxed(),
    ]
}
