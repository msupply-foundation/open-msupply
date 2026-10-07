use crate::sync::translations::{
    form_schema::FormSchemaTranslation, master_list::MasterListTranslation,
};

use repository::{
    DocumentRegistryCategory, DocumentRegistryRow, DocumentRegistryRowRepository,
    StorageConnection, SyncBufferRow,
};
use serde::Deserialize;
use serde_json::Value;
use util::sync_serde::empty_str_as_option_string;

use super::{FkField, PullTranslateResult, SyncTranslation};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum LegacyDocumentCategory {
    Patient,
    ProgramEnrolment,
    Encounter,
    ContactTrace,
    Custom,
    #[serde(other)]
    Others,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyDocumentRegistryRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub category: LegacyDocumentCategory,
    pub document_type: String,
    #[serde(rename = "context_ID")]
    pub context_id: String,
    pub name: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "form_schema_ID")]
    pub form_schema_id: Option<String>,
    pub config: Option<Value>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(DocumentRegistryTranslation)
}

pub(super) struct DocumentRegistryTranslation;
impl SyncTranslation for DocumentRegistryTranslation {
    fn table_name(&self) -> &str {
        "om_document_registry"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            FormSchemaTranslation.table_name(),
            // The program context is synced via the program master list
            MasterListTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyDocumentRegistryRow {
            id,
            document_type,
            context_id,
            category,
            name,
            form_schema_id,
            config,
        } = sync_record.deserialize()?;

        let fk_check = fk_checker.with_table(connection, "document_registry", &id);
        let check_fk = fk_checker.with_table_required(connection, "document_registry", &id);

        // A schema this site does not hold is cleared by the check. The entry
        // keeps the schema it has rather than losing it: an entry with no
        // schema opens no form, and the row replaces the whole local one.
        let form_schema_id = match fk_check(
            form_schema_id.clone(),
            "form_schema_id",
            FkField::FormSchema,
        )? {
            None if form_schema_id.is_some() => DocumentRegistryRowRepository::new(connection)
                .find_one_by_id(&id)?
                .and_then(|row| row.form_schema_id),
            checked => checked,
        };

        let config_str = match config {
            Some(config) => Some(serde_json::to_string(&config)?),
            None => None,
        };

        let result = DocumentRegistryRow {
            id,
            document_type,
            context_id: check_fk(context_id, "context_id", FkField::Context)?,
            category: match category {
                LegacyDocumentCategory::Patient => DocumentRegistryCategory::Patient,
                LegacyDocumentCategory::ProgramEnrolment => {
                    DocumentRegistryCategory::ProgramEnrolment
                }
                LegacyDocumentCategory::Encounter => DocumentRegistryCategory::Encounter,
                LegacyDocumentCategory::ContactTrace => DocumentRegistryCategory::ContactTrace,
                LegacyDocumentCategory::Custom => DocumentRegistryCategory::Custom,
                LegacyDocumentCategory::Others => {
                    return Ok(PullTranslateResult::Ignored(
                        "Unsupported report type".to_string(),
                    ));
                }
            },
            name,
            form_schema_id,
            config: config_str,
            // Legacy central knows nothing of plugins. A row it sends replaces
            // the whole local row, so it also clears a plugin's ownership.
            plugin_code: None,
            program_key: None,
        };

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::translations::{FkChecker, PullTranslateResult};
    use repository::{
        FormSchemaJson, FormSchemaRowRepository, SyncAction, SyncRecordData,
        mock::{MockDataInserts, context_program_a},
        test_db::setup_all,
    };
    use serde_json::json;

    fn translated(connection: &StorageConnection, form_schema_id: &str) -> PullTranslateResult {
        let record = SyncBufferRow {
            table_name: "om_document_registry".to_string(),
            record_id: "entry".to_string(),
            data: SyncRecordData(json!({
                "ID": "entry",
                "category": "ENCOUNTER",
                "document_type": "LegacyEncounter",
                "context_ID": context_program_a().id,
                "name": "Legacy encounter",
                "form_schema_ID": form_schema_id,
                "config": null
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };
        DocumentRegistryTranslation
            .try_translate_from_upsert_sync_record(connection, &FkChecker::new(), &record)
            .unwrap()
    }

    fn entry(form_schema_id: Option<&str>) -> DocumentRegistryRow {
        DocumentRegistryRow {
            id: "entry".to_string(),
            category: DocumentRegistryCategory::Encounter,
            document_type: "LegacyEncounter".to_string(),
            context_id: context_program_a().id,
            name: Some("Legacy encounter".to_string()),
            form_schema_id: form_schema_id.map(str::to_string),
            config: None,
            plugin_code: None,
            program_key: None,
        }
    }

    #[actix_rt::test]
    async fn a_schema_this_site_lacks_keeps_the_entry_on_its_own() {
        let (_, connection, _, _) = setup_all(
            "document_registry_missing_schema",
            MockDataInserts::none().contexts(),
        )
        .await;
        for id in ["stored_schema", "sent_schema"] {
            FormSchemaRowRepository::new(&connection)
                .upsert_one(&FormSchemaJson {
                    id: id.to_string(),
                    r#type: "JsonForms".to_string(),
                    json_schema: json!({}),
                    ui_schema: json!({}),
                })
                .unwrap();
        }
        DocumentRegistryRowRepository::new(&connection)
            .upsert_one(&entry(Some("stored_schema")))
            .unwrap();

        // A schema the site holds replaces the entry's.
        assert_eq!(
            translated(&connection, "sent_schema"),
            PullTranslateResult::upsert(entry(Some("sent_schema")))
        );
        // One it does not hold leaves the entry on the schema it has.
        assert_eq!(
            translated(&connection, "missing_schema"),
            PullTranslateResult::upsert(entry(Some("stored_schema")))
        );
        // None sent is none.
        assert_eq!(
            translated(&connection, ""),
            PullTranslateResult::upsert(entry(None))
        );
    }
}
