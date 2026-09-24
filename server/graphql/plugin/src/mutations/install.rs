use crate::queries::uploaded_info::PluginInfoNode;
use async_graphql::Context;
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    plugin::{form_plugin::FormInstallOptions, InstallUploadedPluginError},
    UploadedFile,
};
use util::format_error;

/// The program chosen for one of a form plugin's program keys.
#[derive(InputObject)]
pub struct PluginProgramInput {
    pub program_key: String,
    pub program_id: String,
}

pub fn install_uploaded_plugin(
    ctx: &Context<'_>,
    file_id: String,
    programs: Option<Vec<PluginProgramInput>>,
    take_over: Option<Vec<String>>,
) -> Result<PluginInfoNode> {
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

    let form_options = FormInstallOptions {
        programs: programs
            .unwrap_or_default()
            .into_iter()
            .map(|p| (p.program_key, p.program_id))
            .collect(),
        take_over: take_over.unwrap_or_default().into_iter().collect(),
    };

    service_provider
        .plugin_service
        .install_uploaded_plugin(&context, settings, UploadedFile { file_id }, form_options)
        .map_err(|e| {
            let formatted = format_error(&e);
            match e {
                // A refusal the person installing can act on, with its reason.
                InstallUploadedPluginError::FormPlugin(_) => {
                    StandardGraphqlError::BadUserInput(formatted)
                }
                InstallUploadedPluginError::UploadedFileJsonError(_)
                | InstallUploadedPluginError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted)
                }
            }
            .extend()
        })
        .map(PluginInfoNode::from_install)
}
