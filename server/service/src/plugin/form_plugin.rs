//! Installing a form plugin's declarative half: its schema versions into
//! `form_schema` and its document types into `document_registry`.
//!
//! The server never runs a form plugin's code, so everything it must know about
//! the plugin's documents arrives as data in the bundle (the "sidecar",
//! frontend/kdd/custom-forms/specs.md § Bundled schemas and the sidecar). Install
//! is the one writer of the rows it produces: an entry records the plugin that
//! wrote it, and a second plugin claiming the same document type is refused.
//!
//! A program-category entry needs a real program before it can be written,
//! because `document_registry.context_id` is a required foreign key that every
//! receiving site checks. The program for each of the plugin's program keys is
//! therefore chosen at install, and install refuses rather than write an entry
//! without one.

use std::collections::{HashMap, HashSet};

use repository::{
    DocumentFilter, DocumentRegistryCategory, DocumentRegistryConfig, DocumentRegistryRow,
    DocumentRegistryRowRepository, DocumentRepository, EqualFilter, FormSchemaJson,
    FormSchemaRowRepository, ProgramFilter, ProgramRepository, ProgramRowRepository,
    RepositoryError, StorageConnection,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use util::constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE};

/// `form_schema.type` for a program document schema, the value the old UI's
/// JSON Forms schemas carry, so an old-UI site treats the row as one of its own.
const FORM_SCHEMA_TYPE: &str = "JsonForms";

/// One form plugin's sidecar, as packed into the bundle by
/// frontend/scripts/build-plugins.mjs.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct FormPluginSidecar {
    pub plugin_code: String,
    /// The plugin's own names for the programs it serves. Each is mapped to a
    /// real program at install.
    pub program_keys: Vec<String>,
    pub document_types: Vec<DocumentTypeDeclaration>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct DocumentTypeDeclaration {
    pub document_type: String,
    pub category: DocumentRegistryCategory,
    /// The display name written to the registry entry, shown where the plugin
    /// is not loaded.
    pub name: String,
    /// `None` for Patient, whose context is fixed; required for every other
    /// category.
    pub program_key: Option<String>,
    /// Every schema version ever published, oldest first. The last is current
    /// and is the one the registry entry points at.
    pub versions: Vec<SchemaVersion>,
    /// Program event rules, in the server's existing event config format.
    pub config: Option<DocumentRegistryConfig>,
    /// The JSON Forms UI schema the old client draws this type's form from,
    /// carried while any site still runs the old client and deleted from the
    /// plugin when the last one goes. Install writes it to every version it
    /// adds and to the current version, which is the one the old client reads.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub legacy_ui_schema: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct SchemaVersion {
    /// A content hash, so an unchanged schema keeps its id across re-packs; or,
    /// for a version a deployment already held before the plugin took the type
    /// over, that deployment's own id, so documents pinned to it stay pinned.
    pub id: String,
    pub json_schema: serde_json::Value,
}

/// What the person installing chose, from the CLI's `--program` and
/// `--take-over` options.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct FormInstallOptions {
    /// Program key to program id. A key not named here keeps the program it is
    /// already bound to.
    pub programs: HashMap<String, String>,
    /// Document types whose existing entry, owned by no plugin, the installing
    /// plugin may take over.
    pub take_over: HashSet<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RegistryOutcome {
    Created,
    Updated,
    TakenOver,
    Unchanged,
}

/// One registry entry as install left it, reported back to the CLI.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct InstalledDocumentType {
    pub plugin_code: String,
    pub document_type: String,
    pub program_key: Option<String>,
    pub context_id: String,
    pub form_schema_id: String,
    pub outcome: RegistryOutcome,
    /// Schema versions this install added; versions already present keep
    /// their schema.
    pub schemas_added: usize,
    /// Versions already present whose legacy UI schema this install replaced.
    pub ui_schemas_updated: usize,
}

#[derive(Error, Debug, PartialEq)]
pub enum FormPluginInstallError {
    #[error("Document type {0} is declared more than once in the bundle")]
    DuplicateDocumentType(String),
    #[error("Document type {0} declares no schema version")]
    NoSchemaVersions(String),
    #[error(
        "A Patient-category entry must have document type \"{PATIENT_TYPE}\", which the server \
         uses for every patient record; {0} does not"
    )]
    PatientTypeName(String),
    #[error(
        "{0} is a Patient entry, which belongs to no program, so it must not name a program key"
    )]
    PatientWithProgramKey(String),
    #[error("{document_type} ({category:?}) needs a program key")]
    MissingProgramKey {
        document_type: String,
        category: DocumentRegistryCategory,
    },
    #[error("{document_type} names program key \"{program_key}\", which plugin {plugin_code} does not declare")]
    UndeclaredProgramKey {
        plugin_code: String,
        document_type: String,
        program_key: String,
    },
    #[error("--program names key \"{0}\", which no form plugin in this bundle declares")]
    ChosenKeyNotDeclared(String),
    #[error("--take-over names {0}, which no form plugin in this bundle declares")]
    TakeOverNotDeclared(String),
    #[error(
        "No program chosen for key \"{program_key}\" of plugin {plugin_code}. Pass --program \
         {program_key}=<programId>. Programs on this server: {available}"
    )]
    NoProgramForKey {
        plugin_code: String,
        program_key: String,
        available: String,
    },
    #[error(
        "Program \"{program_id}\", chosen for key \"{program_key}\", does not exist on this \
         server. Programs on this server: {available}"
    )]
    ProgramNotFound {
        program_key: String,
        program_id: String,
        available: String,
    },
    #[error("Document type {document_type} is owned by plugin {owner}")]
    OwnedByAnotherPlugin {
        document_type: String,
        owner: String,
    },
    #[error(
        "A {document_type} registry entry (id {id}) exists that no plugin installed. Pass \
         --take-over {document_type} to make {plugin_code} its owner; its schema is replaced by \
         the plugin's, which sites running the old UI draw that form from"
    )]
    UnownedEntryExists {
        plugin_code: String,
        document_type: String,
        id: String,
    },
    #[error("{count} registry entries exist for document type {document_type}; install needs at most one")]
    AmbiguousEntries { document_type: String, count: usize },
    #[error(
        "The existing {document_type} entry is a {existing:?} entry, but the plugin declares it as \
         {declared:?}"
    )]
    CategoryMismatch {
        document_type: String,
        existing: DocumentRegistryCategory,
        declared: DocumentRegistryCategory,
    },
    #[error("Only one Patient entry is allowed per deployment, and {0} already exists")]
    OnlyOnePatientEntryAllowed(String),
    #[error(
        "Cannot move key \"{program_key}\" to another program: {count} {document_type} \
         document(s) are saved under its current program (context {context_id}), and install \
         does not move saved records"
    )]
    ProgramChangeBlocked {
        program_key: String,
        document_type: String,
        context_id: String,
        count: i64,
    },
    #[error(
        "Schema {0} is already installed with different content; a published schema version \
         never changes, so the bundle must carry it exactly as installed"
    )]
    SchemaIdConflict(String),
    #[error(
        "{document_type} documents saved on this server are pinned to schema versions the \
         bundle does not list: {pinned}. Every version a document is pinned to must stay in the \
         type's versions under the same id, or those documents open read-only. A type edited \
         after it was installed has had its current version re-generated under a new id; make \
         the change a new version instead. A type taken over needs each of the deployment's \
         own versions declared. (Documents not yet synced to this server are not counted.)"
    )]
    PinnedSchemaVersionsMissing {
        document_type: String,
        /// Each missing schema id with how many documents are pinned to it.
        pinned: String,
    },
    #[error("Could not serialise the event config of {0}")]
    InvalidConfig(String),
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
}

/// Writes every form plugin in the bundle. Runs inside the caller's install
/// transaction, so any refusal leaves nothing written.
pub(crate) fn install_form_plugins(
    connection: &StorageConnection,
    sidecars: &[FormPluginSidecar],
    options: &FormInstallOptions,
) -> Result<Vec<InstalledDocumentType>, FormPluginInstallError> {
    validate_declarations(sidecars, options)?;

    let mut installed = Vec::new();
    for sidecar in sidecars {
        let contexts = resolve_program_contexts(connection, sidecar, options)?;
        for declaration in &sidecar.document_types {
            installed.push(install_document_type(
                connection,
                sidecar,
                declaration,
                &contexts,
                options,
            )?);
        }
    }
    Ok(installed)
}

/// The checks that need no database: the bundle is internally consistent, and
/// the options name only what it declares.
fn validate_declarations(
    sidecars: &[FormPluginSidecar],
    options: &FormInstallOptions,
) -> Result<(), FormPluginInstallError> {
    use FormPluginInstallError as Error;

    let mut document_types = HashSet::new();
    let mut program_keys = HashSet::new();

    for sidecar in sidecars {
        program_keys.extend(sidecar.program_keys.iter().cloned());

        for declaration in &sidecar.document_types {
            let document_type = &declaration.document_type;
            if !document_types.insert(document_type.clone()) {
                return Err(Error::DuplicateDocumentType(document_type.clone()));
            }
            if declaration.versions.is_empty() {
                return Err(Error::NoSchemaVersions(document_type.clone()));
            }

            match (&declaration.category, &declaration.program_key) {
                (DocumentRegistryCategory::Patient, _) if document_type != PATIENT_TYPE => {
                    return Err(Error::PatientTypeName(document_type.clone()))
                }
                (DocumentRegistryCategory::Patient, Some(_)) => {
                    return Err(Error::PatientWithProgramKey(document_type.clone()))
                }
                (DocumentRegistryCategory::Patient, None) => {}
                (category, None) => {
                    return Err(Error::MissingProgramKey {
                        document_type: document_type.clone(),
                        category: category.clone(),
                    })
                }
                (_, Some(program_key)) if !sidecar.program_keys.contains(program_key) => {
                    return Err(Error::UndeclaredProgramKey {
                        plugin_code: sidecar.plugin_code.clone(),
                        document_type: document_type.clone(),
                        program_key: program_key.clone(),
                    })
                }
                (_, Some(_)) => {}
            }
        }
    }

    if let Some(key) = options.programs.keys().find(|k| !program_keys.contains(*k)) {
        return Err(Error::ChosenKeyNotDeclared(key.clone()));
    }
    if let Some(document_type) = options
        .take_over
        .iter()
        .find(|t| !document_types.contains(*t))
    {
        return Err(Error::TakeOverNotDeclared(document_type.clone()));
    }

    Ok(())
}

/// The context for each program key the plugin's document types use: the
/// program chosen on this install, else the one the key is already bound to.
fn resolve_program_contexts(
    connection: &StorageConnection,
    sidecar: &FormPluginSidecar,
    options: &FormInstallOptions,
) -> Result<HashMap<String, String>, FormPluginInstallError> {
    let used_keys: HashSet<&String> = sidecar
        .document_types
        .iter()
        .filter_map(|d| d.program_key.as_ref())
        .collect();

    // A key's binding is not stored on its own: it is the context of the
    // entries the plugin already owns under that key.
    let owned = DocumentRegistryRowRepository::new(connection)
        .find_many_by_plugin_code(&sidecar.plugin_code)?;
    let bound: HashMap<&String, &String> = owned
        .iter()
        .filter_map(|row| row.program_key.as_ref().map(|key| (key, &row.context_id)))
        .collect();

    let mut contexts = HashMap::new();
    for key in used_keys {
        let context_id = match options.programs.get(key) {
            Some(program_id) => ProgramRowRepository::new(connection)
                .find_one_by_id(program_id)?
                .filter(|program| program.deleted_datetime.is_none())
                .map(|program| program.context_id)
                .ok_or_else(|| FormPluginInstallError::ProgramNotFound {
                    program_key: key.clone(),
                    program_id: program_id.clone(),
                    available: available_programs(connection),
                })?,
            None => match bound.get(key) {
                Some(context_id) => (*context_id).clone(),
                None => {
                    return Err(FormPluginInstallError::NoProgramForKey {
                        plugin_code: sidecar.plugin_code.clone(),
                        program_key: key.clone(),
                        available: available_programs(connection),
                    })
                }
            },
        };
        contexts.insert(key.clone(), context_id);
    }
    Ok(contexts)
}

/// Program ids are master list ids, usually long random strings, so a refusal
/// lists them for the person to choose from.
fn available_programs(connection: &StorageConnection) -> String {
    match ProgramRepository::new(connection).query_by_filter(ProgramFilter::new()) {
        Ok(programs) if programs.is_empty() => "none".to_string(),
        Ok(programs) => programs
            .iter()
            .map(|p| format!("{} ({})", p.id, p.name))
            .collect::<Vec<_>>()
            .join(", "),
        Err(_) => "could not be listed".to_string(),
    }
}

fn install_document_type(
    connection: &StorageConnection,
    sidecar: &FormPluginSidecar,
    declaration: &DocumentTypeDeclaration,
    contexts: &HashMap<String, String>,
    options: &FormInstallOptions,
) -> Result<InstalledDocumentType, FormPluginInstallError> {
    use FormPluginInstallError as Error;

    let registry_repo = DocumentRegistryRowRepository::new(connection);
    let document_type = &declaration.document_type;

    let existing = existing_entry(connection, sidecar, declaration, options)?;

    let context_id = match &declaration.program_key {
        None => PATIENT_CONTEXT_ID.to_string(),
        // Resolved for every key a document type uses, so always present.
        Some(key) => contexts[key].clone(),
    };

    if declaration.category == DocumentRegistryCategory::Patient {
        if let Some(other) = registry_repo
            .find_many_by_category(DocumentRegistryCategory::Patient)?
            .into_iter()
            .find(|row| row.document_type != *document_type)
        {
            return Err(Error::OnlyOnePatientEntryAllowed(other.document_type));
        }
    }

    // Saved records carry their own copy of the program, so re-pointing the
    // entry would strand them under the old one.
    if let Some((row, _)) = &existing {
        if row.context_id != context_id {
            let count = DocumentRepository::new(connection).count(Some(
                DocumentFilter::new()
                    .r#type(EqualFilter::equal_to(document_type.to_string()))
                    .context_id(EqualFilter::equal_to(row.context_id.to_string())),
            ))?;
            if count > 0 {
                return Err(Error::ProgramChangeBlocked {
                    program_key: declaration.program_key.clone().unwrap_or_default(),
                    document_type: document_type.clone(),
                    context_id: row.context_id.clone(),
                    count,
                });
            }
        }
    }

    // A document opens in the version of the form its schema id names, so a
    // version that documents are pinned to can never leave the list.
    let declared: HashSet<&String> = declaration.versions.iter().map(|v| &v.id).collect();
    let missing: Vec<String> = DocumentRepository::new(connection)
        .count_by_form_schema_id(document_type)?
        .into_iter()
        .filter(|(schema_id, _)| !declared.contains(schema_id))
        .map(|(schema_id, count)| {
            let noun = if count == 1 { "document" } else { "documents" };
            format!("{schema_id} ({count} {noun})")
        })
        .collect();
    if !missing.is_empty() {
        return Err(Error::PinnedSchemaVersionsMissing {
            document_type: document_type.clone(),
            pinned: missing.join(", "),
        });
    }

    let (schemas_added, ui_schemas_updated) = install_schema_versions(connection, declaration)?;

    // Checked non-empty in validate_declarations.
    let current_schema_id = declaration.versions.last().unwrap().id.clone();
    let config = declaration
        .config
        .as_ref()
        .map(serde_json::to_string)
        .transpose()
        .map_err(|_| Error::InvalidConfig(document_type.clone()))?;

    let row = DocumentRegistryRow {
        // A taken-over or re-installed entry keeps its id, so there is never a
        // second row for one document type.
        id: existing.as_ref().map_or_else(
            || format!("{}_{}", sidecar.plugin_code, document_type),
            |(row, _)| row.id.clone(),
        ),
        category: declaration.category.clone(),
        document_type: document_type.clone(),
        context_id: context_id.clone(),
        name: Some(declaration.name.clone()),
        form_schema_id: Some(current_schema_id.clone()),
        config,
        plugin_code: Some(sidecar.plugin_code.clone()),
        program_key: declaration.program_key.clone(),
    };

    let outcome = match existing {
        Some((existing_row, _)) if existing_row == row => RegistryOutcome::Unchanged,
        Some((_, taken_over)) => {
            registry_repo.upsert_one(&row)?;
            if taken_over {
                RegistryOutcome::TakenOver
            } else {
                RegistryOutcome::Updated
            }
        }
        None => {
            registry_repo.upsert_one(&row)?;
            RegistryOutcome::Created
        }
    };

    Ok(InstalledDocumentType {
        plugin_code: sidecar.plugin_code.clone(),
        document_type: document_type.clone(),
        program_key: declaration.program_key.clone(),
        context_id,
        form_schema_id: current_schema_id,
        outcome,
        schemas_added,
        ui_schemas_updated,
    })
}

/// The entry install will update, with whether updating it is a take-over:
/// the plugin's own entry, or one no plugin owns when the options allow it.
fn existing_entry(
    connection: &StorageConnection,
    sidecar: &FormPluginSidecar,
    declaration: &DocumentTypeDeclaration,
    options: &FormInstallOptions,
) -> Result<Option<(DocumentRegistryRow, bool)>, FormPluginInstallError> {
    use FormPluginInstallError as Error;

    let document_type = &declaration.document_type;
    let mut rows =
        DocumentRegistryRowRepository::new(connection).find_many_by_document_type(document_type)?;

    if let Some(owner) = rows
        .iter()
        .filter_map(|row| row.plugin_code.as_ref())
        .find(|owner| **owner != sidecar.plugin_code)
    {
        return Err(Error::OwnedByAnotherPlugin {
            document_type: document_type.clone(),
            owner: owner.clone(),
        });
    }
    if rows.len() > 1 {
        return Err(Error::AmbiguousEntries {
            document_type: document_type.clone(),
            count: rows.len(),
        });
    }
    let Some(row) = rows.pop() else {
        return Ok(None);
    };

    if row.category != declaration.category {
        return Err(Error::CategoryMismatch {
            document_type: document_type.clone(),
            existing: row.category,
            declared: declaration.category.clone(),
        });
    }

    match row.plugin_code {
        Some(_) => Ok(Some((row, false))),
        None if options.take_over.contains(document_type) => Ok(Some((row, true))),
        None => Err(Error::UnownedEntryExists {
            plugin_code: sidecar.plugin_code.clone(),
            document_type: document_type.clone(),
            id: row.id,
        }),
    }
}

/// Adds each version not yet installed, with the type's legacy UI schema, and
/// returns how many it added and how many installed versions' UI schemas it
/// replaced. An installed version keeps its schema; only the current one's UI
/// schema is brought in line, because the old client draws the form from the
/// registry's current version alone. Nothing is written for a version already
/// as declared, so re-installing an unchanged bundle writes no changelog row,
/// and a type that declares no legacy UI schema leaves the stored ones as they
/// are (a taken-over version keeps the one its deployment gave it).
fn install_schema_versions(
    connection: &StorageConnection,
    declaration: &DocumentTypeDeclaration,
) -> Result<(usize, usize), FormPluginInstallError> {
    let repo = FormSchemaRowRepository::new(connection);
    let legacy_ui_schema = declaration.legacy_ui_schema.as_ref();
    // Checked non-empty in validate_declarations.
    let current_id = &declaration.versions.last().unwrap().id;
    let (mut added, mut ui_updated) = (0, 0);
    for version in &declaration.versions {
        match repo.find_one_by_id(&version.id)? {
            Some(installed) if installed.json_schema != version.json_schema => {
                return Err(FormPluginInstallError::SchemaIdConflict(version.id.clone()))
            }
            Some(installed) => {
                let replace = legacy_ui_schema.filter(|ui_schema| {
                    version.id == *current_id && installed.ui_schema != **ui_schema
                });
                if let Some(ui_schema) = replace {
                    repo.upsert_one(&FormSchemaJson {
                        ui_schema: ui_schema.clone(),
                        ..installed
                    })?;
                    ui_updated += 1;
                }
            }
            None => {
                repo.upsert_one(&FormSchemaJson {
                    id: version.id.clone(),
                    r#type: FORM_SCHEMA_TYPE.to_string(),
                    json_schema: version.json_schema.clone(),
                    ui_schema: legacy_ui_schema
                        .cloned()
                        .unwrap_or_else(|| serde_json::json!({})),
                })?;
                added += 1;
            }
        }
    }
    Ok((added, ui_updated))
}

#[cfg(test)]
mod test {
    use std::collections::{HashMap, HashSet};

    use chrono::Utc;
    use repository::{
        mock::{context_program_a, MockDataInserts},
        test_db::setup_all,
        ChangelogCondition, ChangelogRepository, ChangelogTableName, CursorAndLimit, Document,
        DocumentRegistryCategory, DocumentRegistryConfig, DocumentRegistryRow,
        DocumentRegistryRowRepository, DocumentRepository, DocumentStatus, FormSchemaJson,
        FormSchemaRowRepository, StorageConnection,
    };
    use serde_json::json;
    use util::constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE};

    use super::{
        install_form_plugins, DocumentTypeDeclaration, FormInstallOptions,
        FormPluginInstallError as Error, FormPluginSidecar, RegistryOutcome, SchemaVersion,
    };

    const PLUGIN: &str = "demo_program";

    fn version(document_type: &str, n: usize) -> SchemaVersion {
        SchemaVersion {
            id: format!("{PLUGIN}_{document_type}_v{n}_hash"),
            json_schema: json!({ "type": "object", "title": format!("{document_type} v{n}") }),
        }
    }

    fn declaration(
        document_type: &str,
        category: DocumentRegistryCategory,
        program_key: Option<&str>,
        versions: usize,
    ) -> DocumentTypeDeclaration {
        DocumentTypeDeclaration {
            document_type: document_type.to_string(),
            category,
            name: format!("{document_type} name"),
            program_key: program_key.map(str::to_string),
            versions: (1..=versions).map(|n| version(document_type, n)).collect(),
            config: None,
            legacy_ui_schema: None,
        }
    }

    fn demo_sidecar() -> FormPluginSidecar {
        let mut encounter = declaration(
            "DemoEncounter",
            DocumentRegistryCategory::Encounter,
            Some("demo"),
            2,
        );
        encounter.config = Some(
            serde_json::from_value::<DocumentRegistryConfig>(json!({
                "events": [{
                    "type": "Field",
                    "conditions": [{ "field": "extension.demo.regimen", "isSet": true }],
                    "event": {
                        "documentType": "DemoProgramEnrolment",
                        "type": "currentRegimen",
                        "dataField": "extension.demo.regimen"
                    }
                }]
            }))
            .unwrap(),
        );
        FormPluginSidecar {
            plugin_code: PLUGIN.to_string(),
            program_keys: vec!["demo".to_string()],
            document_types: vec![
                declaration(PATIENT_TYPE, DocumentRegistryCategory::Patient, None, 1),
                declaration(
                    "DemoProgramEnrolment",
                    DocumentRegistryCategory::ProgramEnrolment,
                    Some("demo"),
                    1,
                ),
                encounter,
            ],
        }
    }

    fn options(programs: &[(&str, &str)], take_over: &[&str]) -> FormInstallOptions {
        FormInstallOptions {
            programs: programs
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect::<HashMap<_, _>>(),
            take_over: take_over
                .iter()
                .map(|t| t.to_string())
                .collect::<HashSet<_>>(),
        }
    }

    async fn setup(name: &str) -> StorageConnection {
        let (_, connection, _, _) = setup_all(
            name,
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .name_store_joins()
                .full_master_lists()
                .contexts()
                .programs(),
        )
        .await;
        connection
    }

    /// An entry written outside any plugin, as the push scripts write a
    /// deployment's Patient entry.
    fn insert_unowned_entry(
        connection: &StorageConnection,
        id: &str,
        document_type: &str,
        category: DocumentRegistryCategory,
        context_id: &str,
    ) {
        let schema_id = format!("{id}_schema");
        FormSchemaRowRepository::new(connection)
            .upsert_one(&FormSchemaJson {
                id: schema_id.clone(),
                r#type: "JsonForms".to_string(),
                json_schema: json!({}),
                ui_schema: json!({ "type": "VerticalLayout" }),
            })
            .unwrap();
        DocumentRegistryRowRepository::new(connection)
            .upsert_one(&DocumentRegistryRow {
                id: id.to_string(),
                category,
                document_type: document_type.to_string(),
                context_id: context_id.to_string(),
                name: None,
                form_schema_id: Some(schema_id),
                config: None,
                plugin_code: None,
                program_key: None,
            })
            .unwrap();
    }

    fn entry(connection: &StorageConnection, document_type: &str) -> DocumentRegistryRow {
        let mut rows = DocumentRegistryRowRepository::new(connection)
            .find_many_by_document_type(document_type)
            .unwrap();
        assert_eq!(rows.len(), 1, "{}", document_type);
        rows.pop().unwrap()
    }

    fn ui_schema(connection: &StorageConnection, schema_id: &str) -> serde_json::Value {
        FormSchemaRowRepository::new(connection)
            .find_one_by_id(schema_id)
            .unwrap()
            .unwrap()
            .ui_schema
    }

    /// The rows written since `cursor`, as sync would send them on.
    fn written_since(
        connection: &StorageConnection,
        cursor: u64,
    ) -> Vec<(ChangelogTableName, String)> {
        ChangelogRepository::new(connection)
            .query(
                ChangelogCondition::True(),
                CursorAndLimit {
                    cursor: cursor as i64,
                    limit: i64::MAX,
                },
            )
            .unwrap()
            .rows
            .into_iter()
            .map(|row| (row.table_name, row.record_id))
            .collect()
    }

    fn max_cursor(connection: &StorageConnection) -> u64 {
        ChangelogRepository::new(connection).max_cursor().unwrap()
    }

    #[actix_rt::test]
    async fn first_install_writes_every_version_and_entry() {
        let connection = setup("form_plugin_first_install").await;
        insert_unowned_entry(
            &connection,
            "existing_patient_entry",
            PATIENT_TYPE,
            DocumentRegistryCategory::Patient,
            PATIENT_CONTEXT_ID,
        );

        let installed = install_form_plugins(
            &connection,
            &[demo_sidecar()],
            &options(&[("demo", "program_a")], &[PATIENT_TYPE]),
        )
        .unwrap();

        let outcomes: Vec<_> = installed
            .iter()
            .map(|i| (i.document_type.as_str(), i.outcome, i.schemas_added))
            .collect();
        assert_eq!(
            outcomes,
            vec![
                (PATIENT_TYPE, RegistryOutcome::TakenOver, 1),
                ("DemoProgramEnrolment", RegistryOutcome::Created, 1),
                ("DemoEncounter", RegistryOutcome::Created, 2),
            ]
        );

        // Every version is installed, not only the current one.
        let schema_repo = FormSchemaRowRepository::new(&connection);
        for id in [
            "demo_program_DemoEncounter_v1_hash",
            "demo_program_DemoEncounter_v2_hash",
        ] {
            assert!(schema_repo.find_one_by_id(id).unwrap().is_some(), "{}", id);
        }

        // The taken-over entry keeps its id, so there is still exactly one.
        let patient = entry(&connection, PATIENT_TYPE);
        assert_eq!(patient.id, "existing_patient_entry");
        assert_eq!(patient.context_id, PATIENT_CONTEXT_ID);
        assert_eq!(patient.plugin_code.as_deref(), Some(PLUGIN));
        assert_eq!(patient.program_key, None);
        assert_eq!(
            patient.form_schema_id.as_deref(),
            Some("demo_program_Patient_v1_hash")
        );

        let encounter = entry(&connection, "DemoEncounter");
        assert_eq!(encounter.id, "demo_program_DemoEncounter");
        assert_eq!(encounter.context_id, context_program_a().id);
        assert_eq!(encounter.program_key.as_deref(), Some("demo"));
        assert_eq!(
            encounter.form_schema_id.as_deref(),
            Some("demo_program_DemoEncounter_v2_hash")
        );
        let config: DocumentRegistryConfig =
            serde_json::from_str(encounter.config.as_deref().unwrap()).unwrap();
        assert_eq!(
            config,
            demo_sidecar().document_types[2].config.clone().unwrap()
        );
    }

    #[actix_rt::test]
    async fn reinstall_keeps_the_program_and_writes_nothing_unchanged() {
        let connection = setup("form_plugin_reinstall").await;
        let sidecar = demo_sidecar();
        install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap();

        // No --program: the key keeps the program it is bound to.
        let cursor = max_cursor(&connection);
        let installed =
            install_form_plugins(&connection, &[sidecar], &FormInstallOptions::default()).unwrap();

        assert!(installed
            .iter()
            .all(|i| i.outcome == RegistryOutcome::Unchanged
                && i.schemas_added == 0
                && i.ui_schemas_updated == 0));
        assert_eq!(
            entry(&connection, "DemoEncounter").context_id,
            context_program_a().id
        );
        // Nothing for sync to send on.
        assert_eq!(written_since(&connection, cursor), vec![]);
    }

    #[actix_rt::test]
    async fn the_legacy_ui_schema_goes_on_every_version_added() {
        let connection = setup("form_plugin_legacy_ui_added").await;
        let layout = json!({ "type": "VerticalLayout", "elements": [] });
        let mut sidecar = demo_sidecar();
        sidecar.document_types[2].legacy_ui_schema = Some(layout.clone());
        install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap();

        assert_eq!(
            ui_schema(&connection, "demo_program_DemoEncounter_v1_hash"),
            layout
        );
        assert_eq!(
            ui_schema(&connection, "demo_program_DemoEncounter_v2_hash"),
            layout
        );
        // A type with none gets the empty UI schema.
        assert_eq!(
            ui_schema(&connection, "demo_program_Patient_v1_hash"),
            json!({})
        );

        // A later version gets it too; the versions already holding it are not
        // written again.
        sidecar.document_types[2]
            .versions
            .push(version("DemoEncounter", 3));
        let installed =
            install_form_plugins(&connection, &[sidecar], &FormInstallOptions::default()).unwrap();
        assert_eq!(
            (installed[2].schemas_added, installed[2].ui_schemas_updated),
            (1, 0)
        );
        assert_eq!(
            ui_schema(&connection, "demo_program_DemoEncounter_v3_hash"),
            layout
        );
    }

    /// A deployment's type taken over with its pre-plugin schema as the
    /// plugin's v1: that row, its id and its UI schema stay exactly as the
    /// deployment had them, and the plugin's next version carries the same UI
    /// schema to the old client.
    #[actix_rt::test]
    async fn a_take_over_keeps_the_deployed_version_and_its_ui_schema() {
        let connection = setup("form_plugin_legacy_take_over").await;
        insert_unowned_entry(
            &connection,
            "deployed_entry",
            "LegacyEncounter",
            DocumentRegistryCategory::Encounter,
            &context_program_a().id,
        );
        let deployed = FormSchemaRowRepository::new(&connection)
            .find_one_by_id("deployed_entry_schema")
            .unwrap()
            .unwrap();
        let mut legacy = declaration(
            "LegacyEncounter",
            DocumentRegistryCategory::Encounter,
            Some("demo"),
            0,
        );
        legacy.versions = vec![SchemaVersion {
            id: deployed.id.clone(),
            json_schema: deployed.json_schema.clone(),
        }];
        legacy.legacy_ui_schema = Some(deployed.ui_schema.clone());
        let mut sidecar = demo_sidecar();
        sidecar.document_types.push(legacy);

        let cursor = max_cursor(&connection);
        let installed = install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_a")], &["LegacyEncounter"]),
        )
        .unwrap();

        let taken_over = &installed[3];
        assert_eq!(
            (
                taken_over.outcome,
                taken_over.schemas_added,
                taken_over.ui_schemas_updated
            ),
            (RegistryOutcome::TakenOver, 0, 0)
        );
        // Only the registry entry changed hands; the deployed schema row was not
        // written at all.
        let written = written_since(&connection, cursor);
        assert!(written.contains(&(
            ChangelogTableName::DocumentRegistry,
            "deployed_entry".to_string()
        )));
        assert!(!written.contains(&(ChangelogTableName::FormSchema, deployed.id.clone())));
        assert_eq!(
            entry(&connection, "LegacyEncounter").form_schema_id,
            Some(deployed.id.clone())
        );

        // The plugin's v2 carries the deployed UI schema, and v1 is untouched.
        sidecar.document_types[3]
            .versions
            .push(version("LegacyEncounter", 2));
        install_form_plugins(&connection, &[sidecar], &FormInstallOptions::default()).unwrap();
        assert_eq!(
            ui_schema(&connection, "demo_program_LegacyEncounter_v2_hash"),
            deployed.ui_schema
        );
        assert_eq!(
            FormSchemaRowRepository::new(&connection)
                .find_one_by_id(&deployed.id)
                .unwrap(),
            Some(deployed)
        );
    }

    #[actix_rt::test]
    async fn a_changed_legacy_ui_schema_replaces_only_the_current_versions() {
        let connection = setup("form_plugin_legacy_ui_changed").await;
        let mut sidecar = demo_sidecar();
        sidecar.document_types[2].legacy_ui_schema = Some(json!({ "type": "VerticalLayout" }));
        install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap();

        let fixed = json!({ "type": "VerticalLayout", "elements": [] });
        sidecar.document_types[2].legacy_ui_schema = Some(fixed.clone());
        let installed =
            install_form_plugins(&connection, &[sidecar], &FormInstallOptions::default()).unwrap();

        assert_eq!(installed[2].outcome, RegistryOutcome::Unchanged);
        assert_eq!(installed[2].ui_schemas_updated, 1);
        assert_eq!(
            ui_schema(&connection, "demo_program_DemoEncounter_v2_hash"),
            fixed
        );
        assert_eq!(
            ui_schema(&connection, "demo_program_DemoEncounter_v1_hash"),
            json!({ "type": "VerticalLayout" })
        );
    }

    /// A plugin that has dropped its legacy UI schema (the last old-UI site is
    /// gone) leaves the stored ones as they are.
    #[actix_rt::test]
    async fn no_legacy_ui_schema_leaves_the_stored_one() {
        let connection = setup("form_plugin_legacy_ui_dropped").await;
        let mut sidecar = demo_sidecar();
        sidecar.document_types[2].legacy_ui_schema = Some(json!({ "type": "VerticalLayout" }));
        install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap();

        sidecar.document_types[2].legacy_ui_schema = None;
        let cursor = max_cursor(&connection);
        install_form_plugins(&connection, &[sidecar], &FormInstallOptions::default()).unwrap();

        assert_eq!(
            ui_schema(&connection, "demo_program_DemoEncounter_v2_hash"),
            json!({ "type": "VerticalLayout" })
        );
        assert_eq!(written_since(&connection, cursor), vec![]);
    }

    #[actix_rt::test]
    async fn a_new_version_updates_the_entry_and_keeps_the_old_one() {
        let connection = setup("form_plugin_new_version").await;
        let mut sidecar = demo_sidecar();
        install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap();

        sidecar.document_types[2]
            .versions
            .push(version("DemoEncounter", 3));
        let installed =
            install_form_plugins(&connection, &[sidecar], &FormInstallOptions::default()).unwrap();

        assert_eq!(installed[2].outcome, RegistryOutcome::Updated);
        assert_eq!(installed[2].schemas_added, 1);
        assert_eq!(
            entry(&connection, "DemoEncounter")
                .form_schema_id
                .as_deref(),
            Some("demo_program_DemoEncounter_v3_hash")
        );
        assert!(FormSchemaRowRepository::new(&connection)
            .find_one_by_id("demo_program_DemoEncounter_v1_hash")
            .unwrap()
            .is_some());
    }

    #[actix_rt::test]
    async fn a_key_with_no_program_is_refused_listing_the_programs() {
        let connection = setup("form_plugin_no_program").await;

        let error = install_form_plugins(
            &connection,
            &[demo_sidecar()],
            &FormInstallOptions::default(),
        )
        .unwrap_err();

        let Error::NoProgramForKey {
            program_key,
            available,
            ..
        } = error
        else {
            panic!("{:?}", error);
        };
        assert_eq!(program_key, "demo");
        assert!(available.contains("program_a (program_a)"), "{}", available);
    }

    #[actix_rt::test]
    async fn an_unknown_program_is_refused() {
        let connection = setup("form_plugin_unknown_program").await;

        let error = install_form_plugins(
            &connection,
            &[demo_sidecar()],
            &options(&[("demo", "no_such_program")], &[]),
        )
        .unwrap_err();

        assert!(
            matches!(&error, Error::ProgramNotFound { program_id, .. } if program_id == "no_such_program"),
            "{:?}",
            error
        );
    }

    #[actix_rt::test]
    async fn an_unowned_entry_needs_take_over() {
        let connection = setup("form_plugin_unowned").await;
        insert_unowned_entry(
            &connection,
            "existing_patient_entry",
            PATIENT_TYPE,
            DocumentRegistryCategory::Patient,
            PATIENT_CONTEXT_ID,
        );

        let error = install_form_plugins(
            &connection,
            &[demo_sidecar()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap_err();

        assert_eq!(
            error,
            Error::UnownedEntryExists {
                plugin_code: PLUGIN.to_string(),
                document_type: PATIENT_TYPE.to_string(),
                id: "existing_patient_entry".to_string(),
            }
        );
    }

    #[actix_rt::test]
    async fn an_entry_owned_by_another_plugin_is_refused_even_with_take_over() {
        let connection = setup("form_plugin_owned_elsewhere").await;
        install_form_plugins(
            &connection,
            &[demo_sidecar()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap();

        let rival = FormPluginSidecar {
            plugin_code: "rival".to_string(),
            program_keys: vec!["hiv".to_string()],
            document_types: vec![declaration(
                "DemoEncounter",
                DocumentRegistryCategory::Encounter,
                Some("hiv"),
                1,
            )],
        };
        let error = install_form_plugins(
            &connection,
            &[rival],
            &options(&[("hiv", "program_b")], &["DemoEncounter"]),
        )
        .unwrap_err();

        assert_eq!(
            error,
            Error::OwnedByAnotherPlugin {
                document_type: "DemoEncounter".to_string(),
                owner: PLUGIN.to_string(),
            }
        );
    }

    #[actix_rt::test]
    async fn changing_the_program_is_refused_once_documents_are_saved() {
        let connection = setup("form_plugin_program_change").await;
        let sidecar = demo_sidecar();
        install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap();

        // Nothing saved yet: a wrong choice is corrected by choosing again.
        install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_b")], &[]),
        )
        .unwrap();
        assert_eq!(entry(&connection, "DemoEncounter").context_id, "program_b");

        DocumentRepository::new(&connection)
            .insert(&Document {
                id: "saved_encounter_v1".to_string(),
                name: "patients/p1/encounter/e1".to_string(),
                parent_ids: vec![],
                user_id: "user".to_string(),
                datetime: Utc::now(),
                r#type: "DemoEncounter".to_string(),
                data: json!({}),
                form_schema_id: Some("demo_program_DemoEncounter_v2_hash".to_string()),
                status: DocumentStatus::Active,
                owner_name_id: None,
                context_id: "program_b".to_string(),
            })
            .unwrap();

        let error = install_form_plugins(
            &connection,
            &[sidecar],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap_err();

        assert_eq!(
            error,
            Error::ProgramChangeBlocked {
                program_key: "demo".to_string(),
                document_type: "DemoEncounter".to_string(),
                context_id: "program_b".to_string(),
                count: 1,
            }
        );
    }

    fn save_document(
        connection: &StorageConnection,
        name: &str,
        document_type: &str,
        form_schema_id: &str,
        context_id: &str,
        status: DocumentStatus,
    ) {
        DocumentRepository::new(connection)
            .insert(&Document {
                id: format!("{name}_v1"),
                name: name.to_string(),
                parent_ids: vec![],
                user_id: "user".to_string(),
                datetime: Utc::now(),
                r#type: document_type.to_string(),
                data: json!({}),
                form_schema_id: Some(form_schema_id.to_string()),
                status,
                owner_name_id: None,
                context_id: context_id.to_string(),
            })
            .unwrap();
    }

    #[actix_rt::test]
    async fn a_version_documents_are_pinned_to_cannot_be_dropped() {
        let connection = setup("form_plugin_pinned_version").await;
        let mut sidecar = demo_sidecar();
        install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap();
        for name in ["e1", "e2"] {
            save_document(
                &connection,
                &format!("patients/p1/encounter/{name}"),
                "DemoEncounter",
                "demo_program_DemoEncounter_v2_hash",
                "program_a",
                DocumentStatus::Active,
            );
        }
        // A deleted document opens nowhere, so its version is free to go.
        save_document(
            &connection,
            "patients/p1/encounter/e3",
            "DemoEncounter",
            "demo_program_DemoEncounter_v1_hash",
            "program_a",
            DocumentStatus::Deleted,
        );

        // The type edited after install: its current version re-generated
        // under a new id in the same place.
        sidecar.document_types[2].versions[1].id = "demo_program_DemoEncounter_v2_edited".into();
        let error = install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &FormInstallOptions::default(),
        )
        .unwrap_err();
        assert_eq!(
            error,
            Error::PinnedSchemaVersionsMissing {
                document_type: "DemoEncounter".to_string(),
                pinned: "demo_program_DemoEncounter_v2_hash (2 documents)".to_string(),
            }
        );

        // The same change as a new version installs, and v1 may go.
        let mut sidecar = demo_sidecar();
        sidecar.document_types[2].versions.remove(0);
        sidecar.document_types[2]
            .versions
            .push(version("DemoEncounter", 3));
        install_form_plugins(&connection, &[sidecar], &FormInstallOptions::default()).unwrap();
    }

    #[actix_rt::test]
    async fn a_take_over_must_declare_the_versions_documents_are_pinned_to() {
        let connection = setup("form_plugin_take_over_pinned").await;
        insert_unowned_entry(
            &connection,
            "existing_patient_entry",
            PATIENT_TYPE,
            DocumentRegistryCategory::Patient,
            PATIENT_CONTEXT_ID,
        );
        save_document(
            &connection,
            "patients/p1",
            PATIENT_TYPE,
            "existing_patient_entry_schema",
            PATIENT_CONTEXT_ID,
            DocumentStatus::Active,
        );

        let error = install_form_plugins(
            &connection,
            &[demo_sidecar()],
            &options(&[("demo", "program_a")], &[PATIENT_TYPE]),
        )
        .unwrap_err();
        assert_eq!(
            error,
            Error::PinnedSchemaVersionsMissing {
                document_type: PATIENT_TYPE.to_string(),
                pinned: "existing_patient_entry_schema (1 document)".to_string(),
            }
        );

        // Declared under the deployment's own id, ahead of the plugin's.
        let mut sidecar = demo_sidecar();
        sidecar.document_types[0].versions.insert(
            0,
            SchemaVersion {
                id: "existing_patient_entry_schema".to_string(),
                json_schema: json!({}),
            },
        );
        install_form_plugins(
            &connection,
            &[sidecar],
            &options(&[("demo", "program_a")], &[PATIENT_TYPE]),
        )
        .unwrap();
    }

    #[actix_rt::test]
    async fn a_second_patient_type_is_refused() {
        let connection = setup("form_plugin_second_patient").await;
        insert_unowned_entry(
            &connection,
            "legacy_patient_entry",
            "LegacyPatient",
            DocumentRegistryCategory::Patient,
            PATIENT_CONTEXT_ID,
        );

        let error = install_form_plugins(
            &connection,
            &[demo_sidecar()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap_err();

        assert_eq!(
            error,
            Error::OnlyOnePatientEntryAllowed("LegacyPatient".to_string())
        );
    }

    #[actix_rt::test]
    async fn a_schema_id_with_different_content_is_refused() {
        let connection = setup("form_plugin_schema_conflict").await;
        let mut sidecar = demo_sidecar();
        install_form_plugins(
            &connection,
            &[sidecar.clone()],
            &options(&[("demo", "program_a")], &[]),
        )
        .unwrap();

        sidecar.document_types[1].versions[0].json_schema = json!({ "changed": true });
        let error = install_form_plugins(&connection, &[sidecar], &FormInstallOptions::default())
            .unwrap_err();

        assert_eq!(
            error,
            Error::SchemaIdConflict("demo_program_DemoProgramEnrolment_v1_hash".to_string())
        );
    }

    #[actix_rt::test]
    async fn inconsistent_declarations_are_refused_before_anything_is_read() {
        let connection = setup("form_plugin_declarations").await;
        let install = |sidecar: FormPluginSidecar, options: FormInstallOptions| {
            install_form_plugins(&connection, &[sidecar], &options).unwrap_err()
        };
        let chosen = || options(&[("demo", "program_a")], &[]);

        let mut sidecar = demo_sidecar();
        sidecar.document_types[0].document_type = "DemoPatient".to_string();
        assert_eq!(
            install(sidecar, chosen()),
            Error::PatientTypeName("DemoPatient".to_string())
        );

        let mut sidecar = demo_sidecar();
        sidecar.document_types[0].program_key = Some("demo".to_string());
        assert_eq!(
            install(sidecar, chosen()),
            Error::PatientWithProgramKey(PATIENT_TYPE.to_string())
        );

        let mut sidecar = demo_sidecar();
        sidecar.document_types[1].program_key = None;
        assert!(matches!(
            install(sidecar, chosen()),
            Error::MissingProgramKey { .. }
        ));

        let mut sidecar = demo_sidecar();
        sidecar.document_types[1].program_key = Some("typo".to_string());
        assert!(matches!(
            install(sidecar, chosen()),
            Error::UndeclaredProgramKey { program_key, .. } if program_key == "typo"
        ));

        let mut sidecar = demo_sidecar();
        sidecar.document_types[2].versions.clear();
        assert_eq!(
            install(sidecar, chosen()),
            Error::NoSchemaVersions("DemoEncounter".to_string())
        );

        let mut sidecar = demo_sidecar();
        sidecar
            .document_types
            .push(sidecar.document_types[2].clone());
        assert_eq!(
            install(sidecar, chosen()),
            Error::DuplicateDocumentType("DemoEncounter".to_string())
        );

        assert_eq!(
            install(demo_sidecar(), options(&[("hiv", "program_a")], &[])),
            Error::ChosenKeyNotDeclared("hiv".to_string())
        );
        assert_eq!(
            install(
                demo_sidecar(),
                options(&[("demo", "program_a")], &["HIVCareEncounter"])
            ),
            Error::TakeOverNotDeclared("HIVCareEncounter".to_string())
        );
    }
}
