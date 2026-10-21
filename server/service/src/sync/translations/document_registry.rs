use crate::sync::{
    CentralServerConfig,
    translations::{form_schema::FormSchemaTranslation, master_list::MasterListTranslation},
};

use repository::{
    DocumentRegistryCategory, DocumentRegistryRow, DocumentRegistryRowRepository,
    StorageConnection, SyncBufferRow,
};
use serde::Deserialize;
use serde_json::Value;
use util::sync_serde::empty_str_as_option_string;

use super::{FkChecker, FkField, PullTranslateResult, SyncTranslation};

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
        fk_checker: &FkChecker,
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

        // An entry a form plugin owns has one writer: installing the plugin on open
        // mSupply central. Legacy central still holds the entry from before the plugin
        // took the type over, under the same id, and sends it again whenever it changes
        // there. Applying that copy would put the type back on legacy's schema and rules
        // and drop its owner, so it is not applied. Open mSupply central saves its own
        // copy again instead, so the plugin's entry goes back out to every site. A site
        // too old to read it keeps it waiting beside legacy's copy, under a record id of
        // its own (see `document_registry_om::sync_record_id`).
        if let Some(owned) = DocumentRegistryRowRepository::new(connection)
            .find_one_by_id(&id)?
            .filter(|row| row.plugin_code.is_some())
        {
            if CentralServerConfig::is_central_server() {
                return Ok(PullTranslateResult::upsert(owned));
            }
            return Ok(PullTranslateResult::Ignored(format!(
                "Entry {id} is owned by form plugin {}, so legacy central's copy is not applied",
                owned.plugin_code.unwrap_or_default()
            )));
        }

        let config_str = match config {
            Some(config) => Some(serde_json::to_string(&config)?),
            None => None,
        };

        let result = DocumentRegistryRow {
            id,
            document_type,
            context_id,
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
            // Legacy central knows nothing of plugins, so an entry it sends has no
            // owner. A plugin-owned entry never gets this far (see above).
            plugin_code: None,
            program_key: None,
        };

        Ok(PullTranslateResult::upsert(check_foreign_keys(
            connection, fk_checker, result,
        )?))
    }
}

/// Checks an incoming entry's foreign keys, for the entries legacy central
/// sends and for those open mSupply central sends over v6.
///
/// A schema this site does not hold is cleared by the check. The entry keeps
/// the schema it has rather than losing it: an entry with no schema opens no
/// form, and the row replaces the whole local one. A context the site does not
/// hold fails the row, since an entry cannot exist without its program.
pub(super) fn check_foreign_keys(
    connection: &StorageConnection,
    fk_checker: &FkChecker,
    row: DocumentRegistryRow,
) -> Result<DocumentRegistryRow, anyhow::Error> {
    let fk_check = fk_checker.with_table(connection, "document_registry", &row.id);
    let check_fk = fk_checker.with_table_required(connection, "document_registry", &row.id);

    let form_schema_id = match fk_check(
        row.form_schema_id.clone(),
        "form_schema_id",
        FkField::FormSchema,
    )? {
        None if row.form_schema_id.is_some() => DocumentRegistryRowRepository::new(connection)
            .find_one_by_id(&row.id)?
            .and_then(|existing| existing.form_schema_id),
        checked => checked,
    };
    let context_id = check_fk(row.context_id, "context_id", FkField::Context)?;

    Ok(DocumentRegistryRow {
        form_schema_id,
        context_id,
        ..row
    })
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

    fn owned(form_schema_id: &str) -> DocumentRegistryRow {
        DocumentRegistryRow {
            plugin_code: Some("demo_program".to_string()),
            program_key: Some("demo".to_string()),
            ..entry(Some(form_schema_id))
        }
    }

    async fn setup_with_schemas(name: &str) -> StorageConnection {
        let (_, connection, _, _) = setup_all(name, MockDataInserts::none().contexts()).await;
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
        connection
    }

    /// On a site, legacy central's copy of an entry a plugin owns is not applied:
    /// the entry keeps its owner and the plugin's schema.
    #[actix_rt::test]
    async fn a_site_does_not_apply_legacy_copy_of_a_plugin_owned_entry() {
        let connection =
            setup_with_schemas("a_site_does_not_apply_legacy_copy_of_a_plugin_owned_entry").await;
        DocumentRegistryRowRepository::new(&connection)
            .upsert_one(&owned("stored_schema"))
            .unwrap();

        assert!(matches!(
            translated(&connection, "sent_schema"),
            PullTranslateResult::Ignored(_)
        ));
    }

    /// On open mSupply central, legacy central's copy of an entry a plugin owns is
    /// answered by saving the plugin's entry again, unchanged, so it goes back out.
    #[actix_rt::test]
    async fn central_sends_a_plugin_owned_entry_out_again() {
        CentralServerConfig::set_is_central_server_on_startup();
        let connection = setup_with_schemas("central_sends_a_plugin_owned_entry_out_again").await;
        DocumentRegistryRowRepository::new(&connection)
            .upsert_one(&owned("stored_schema"))
            .unwrap();

        assert_eq!(
            translated(&connection, "sent_schema"),
            PullTranslateResult::upsert(owned("stored_schema"))
        );
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
