use repository::{FormSchemaJson, StorageConnection, SyncBufferRow};
use serde::Deserialize;
use serde_json::Value;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyFormSchemaRow {
    #[serde(rename = "ID")]
    id: String,
    r#type: String,
    json_schema: Value,
    ui_schema: Value,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(FormSchemaTranslation)
}

pub(super) struct FormSchemaTranslation;
impl SyncTranslation for FormSchemaTranslation {
    fn table_name(&self) -> &'static str {
        "form_schema"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
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

        Ok(PullTranslateResult::upsert(result))
    }
}
