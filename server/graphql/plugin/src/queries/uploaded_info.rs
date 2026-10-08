use std::collections::HashSet;

use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};

use async_graphql::{Context, Enum, Object, SimpleObject, Union};
use graphql_types::types::program::{
    document_registry::DocumentRegistryCategoryNode, program_node::ProgramNode,
};
use serde_json::json;
use service::{
    UploadedFile, UploadedFileJsonError,
    auth::{Resource, ResourceAccessRequest},
    backend_plugin::plugin_provider::PluginBundle,
    plugin::{
        GetUploadedPluginInfoError, InstalledPluginBundle, UploadedPluginInfo,
        form_plugin::{
            DocumentTypePreview, ExistingEntry, FormInstallPreview, FormPluginPreview,
            InstalledDocumentType, ProgramKeyPreview,
        },
    },
};
use util::format_error;

#[derive(Union)]
pub enum UploadedPluginInfoResponse {
    Response(PluginInfoNode),
    Error(UploadedPluginError),
}

pub fn uploaded_plugin_info(
    ctx: &Context<'_>,
    file_id: String,
) -> Result<UploadedPluginInfoResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePlugin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;
    let settings = ctx.get_settings();

    map_response(service_provider.plugin_service.get_uploaded_plugin_info(
        &context,
        settings,
        UploadedFile { file_id },
    ))
}

pub fn map_response(
    from: Result<UploadedPluginInfo, GetUploadedPluginInfoError>,
) -> Result<UploadedPluginInfoResponse> {
    let result = match from {
        Ok(info) => UploadedPluginInfoResponse::Response(PluginInfoNode::from_domain(info)),
        Err(error) => UploadedPluginInfoResponse::Error(UploadedPluginError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: GetUploadedPluginInfoError) -> Result<UploadedPluginErrorVariant> {
    use StandardGraphqlError::*;
    let formatted_error = format_error(&error);

    let graphql_error = match error {
        // Structured
        GetUploadedPluginInfoError::UploadedFileJsonError(
            UploadedFileJsonError::CannotParseFile(_),
        ) => {
            return Ok(UploadedPluginErrorVariant::CannotParseFile);
        }
        // Internal
        GetUploadedPluginInfoError::UploadedFileJsonError(
            UploadedFileJsonError::UploadedFileConversionError(_)
            | UploadedFileJsonError::ErrorWhileReadingFile(_),
        )
        | GetUploadedPluginInfoError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

pub struct PluginInfoNode {
    pub bundle: PluginBundle,
    /// The registry entries an install left, `None` for an uploaded bundle
    /// that has not been installed.
    pub installed_document_types: Option<Vec<InstalledDocumentType>>,
    /// How the bundle's form plugins stand against this server, `None` on an
    /// install's result (what it left is `installed_document_types`).
    pub form_install_preview: Option<FormInstallPreview>,
}
impl PluginInfoNode {
    pub(crate) fn from_domain(
        UploadedPluginInfo {
            bundle,
            form_install_preview,
        }: UploadedPluginInfo,
    ) -> PluginInfoNode {
        PluginInfoNode {
            bundle,
            installed_document_types: None,
            form_install_preview: Some(form_install_preview),
        }
    }

    pub(crate) fn from_install(
        InstalledPluginBundle {
            bundle,
            document_types,
        }: InstalledPluginBundle,
    ) -> PluginInfoNode {
        PluginInfoNode {
            bundle,
            installed_document_types: Some(document_types),
            form_install_preview: None,
        }
    }
}

#[derive(SimpleObject)]
pub struct UploadedPluginError {
    error: UploadedPluginErrorVariant,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum UploadedPluginErrorVariant {
    CannotParseFile,
}

/// How this server's registry stands for a document type the bundle declares.
#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ExistingRegistryEntryNode {
    /// No entry: install creates one.
    None,
    /// The plugin's own entry, from an earlier install.
    Owned,
    /// An entry no plugin installed: install needs the type named in `takeOver`.
    Unowned,
    /// Another plugin's entry (`existingEntryOwner`): install is refused.
    OwnedByAnotherPlugin,
    /// Several entries for the type: install is refused.
    Ambiguous,
}

/// One document type a form plugin declares, checked against this server.
#[derive(SimpleObject)]
pub struct FormPluginDocumentTypeNode {
    pub document_type: String,
    pub name: String,
    pub category: DocumentRegistryCategoryNode,
    /// `None` for the Patient type, whose context is fixed.
    pub program_key: Option<String>,
    pub existing_entry: ExistingRegistryEntryNode,
    /// The unowned entry's id, for `UNOWNED`.
    pub existing_entry_id: Option<String>,
    /// The owning plugin's code, for `OWNED_BY_ANOTHER_PLUGIN`.
    pub existing_entry_owner: Option<String>,
    /// True when installing would leave the type's form blank on sites still
    /// running the old client, which install refuses unless the type is named
    /// in `blankOldUi`.
    pub blanks_old_ui: bool,
}

/// One of a form plugin's program keys, with the program an earlier install
/// bound it to.
#[derive(SimpleObject)]
pub struct FormPluginProgramKeyNode {
    pub program_key: String,
    /// The declared document types that name this key.
    pub document_types: Vec<String>,
    /// The program the key is already bound to; `None` on a first install,
    /// when `programs` must choose one.
    pub bound_program: Option<ProgramNode>,
}

#[derive(SimpleObject)]
pub struct FormPluginPreviewNode {
    pub plugin_code: String,
    pub program_keys: Vec<FormPluginProgramKeyNode>,
    pub document_types: Vec<FormPluginDocumentTypeNode>,
}

/// What installing the uploaded bundle's form plugins would meet on this
/// server, for the choices `installUploadedPlugin` takes: the program for
/// each key, the types to take over, and the types whose old-client form may
/// go blank.
#[derive(SimpleObject)]
pub struct FormInstallPreviewNode {
    pub form_plugins: Vec<FormPluginPreviewNode>,
    /// The programs on this server, one to choose for each program key.
    pub programs: Vec<ProgramNode>,
}

// The three conversions below map the service's preview (`form_plugin.rs`)
// onto the GraphQL nodes one level at a time: the whole preview, then each
// form plugin, then each document type. They own their input, so fields move
// rather than clone.

impl FormInstallPreviewNode {
    fn from_domain(preview: FormInstallPreview) -> Self {
        FormInstallPreviewNode {
            // One node per form plugin in the bundle.
            form_plugins: preview
                .form_plugins
                .into_iter()
                .map(FormPluginPreviewNode::from_domain)
                .collect(),
            // The server's programs, wrapped in the existing ProgramNode so the
            // client reads them with the fields every other program list has.
            programs: preview
                .programs
                .into_iter()
                .map(|program_row| ProgramNode { program_row })
                .collect(),
        }
    }
}

impl FormPluginPreviewNode {
    fn from_domain(preview: FormPluginPreview) -> Self {
        FormPluginPreviewNode {
            plugin_code: preview.plugin_code,
            // Each key as declared; the program it is bound to becomes a
            // ProgramNode, or null on a first install.
            program_keys: preview
                .program_keys
                .into_iter()
                .map(
                    |ProgramKeyPreview {
                         program_key,
                         document_types,
                         bound_program,
                     }| FormPluginProgramKeyNode {
                        program_key,
                        document_types,
                        bound_program: bound_program.map(|program_row| ProgramNode { program_row }),
                    },
                )
                .collect(),
            // Each declared type with its registry state.
            document_types: preview
                .document_types
                .into_iter()
                .map(FormPluginDocumentTypeNode::from_domain)
                .collect(),
        }
    }
}

impl FormPluginDocumentTypeNode {
    fn from_domain(preview: DocumentTypePreview) -> Self {
        // The service's enum carries its detail inside the variant; GraphQL has
        // no payload-bearing enums, so the detail is flattened into two optional
        // fields beside the plain variant: the unowned entry's id, or the
        // owning plugin's code. Every other variant leaves both empty.
        let (existing_entry, existing_entry_id, existing_entry_owner) = match preview.existing_entry
        {
            ExistingEntry::None => (ExistingRegistryEntryNode::None, None, None),
            ExistingEntry::Owned => (ExistingRegistryEntryNode::Owned, None, None),
            ExistingEntry::Unowned { id } => (ExistingRegistryEntryNode::Unowned, Some(id), None),
            ExistingEntry::OwnedByAnotherPlugin { owner } => (
                ExistingRegistryEntryNode::OwnedByAnotherPlugin,
                None,
                Some(owner),
            ),
            // The count is not worth a field: the install refuses either way.
            ExistingEntry::Ambiguous { .. } => (ExistingRegistryEntryNode::Ambiguous, None, None),
        };
        FormPluginDocumentTypeNode {
            document_type: preview.document_type,
            name: preview.name,
            category: DocumentRegistryCategoryNode::from(preview.category),
            program_key: preview.program_key,
            existing_entry,
            existing_entry_id,
            existing_entry_owner,
            blanks_old_ui: preview.blanks_old_ui,
        }
    }
}

#[Object]
impl PluginInfoNode {
    pub async fn plugin_info(&self) -> serde_json::Value {
        json!({
            "backend":
                self.bundle
                    .backend_plugins
                    .iter()
                    .map(|r| json!({ "backend_code": r.code.clone(), "types": r.types.clone() }))
                    .collect::<HashSet<serde_json::Value>>(),
            "frontend":
                self.bundle
                    .frontend_plugins
                    .iter()
                    .map(|r| json!({ "front_end": r.code.clone(), "types": r.types.clone() }))
                    .collect::<HashSet<serde_json::Value>>(),
            "forms":
                self.bundle
                    .form_plugins
                    .iter()
                    .map(|f| json!({
                        "plugin_code": f.plugin_code,
                        "program_keys": f.program_keys,
                        "document_types": f.document_types.iter().map(|d| &d.document_type).collect::<Vec<_>>(),
                    }))
                    .collect::<Vec<serde_json::Value>>(),
            "installed_document_types": self.installed_document_types,
            "NOTE": "Back end plugins are not currently 'stackable', i.e. only one instance of transform request requisition line plugin will be executed"
        })
    }

    /// How the bundle's form plugins stand against this server, read before
    /// installing: each program key's current program, each document type's
    /// existing registry entry and whether installing it would blank the old
    /// client's form, and the programs to choose from. Null on an install's
    /// result.
    pub async fn form_install_preview(&self) -> Option<FormInstallPreviewNode> {
        self.form_install_preview
            .clone()
            .map(FormInstallPreviewNode::from_domain)
    }
}
