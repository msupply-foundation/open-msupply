use repository::{FormSchemaJson, StorageConnection, SyncBufferRow};
use serde::Deserialize;
use serde_json::Value;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyFormSchemaRow {
    #[serde(rename = "ID")]
    id: String,
    r#type: String,
    json_schema: Value,
    ui_schema: Value,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::FORM_SCHEMA
}

pub(crate) struct FormSchemaTranslation {}
impl SyncTranslation for FormSchemaTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }
        let LegacyFormSchemaRow {
            id,
            r#type,
            json_schema,
            ui_schema,
        } = serde_json::from_str::<LegacyFormSchemaRow>(&sync_record.data)?;

        let result = FormSchemaJson {
            id,
            r#type,
            json_schema,
            ui_schema,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::FormSchema(result),
        )))
    }
}
