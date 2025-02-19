use std::collections::HashSet;

use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use async_graphql::{Context, Enum, Object, SimpleObject, Union};
use serde_json::json;
use service::{backend_plugin::plugin_provider::PluginBundle, UploadedFile, UploadedFileJsonError};
use util::format_error;

#[derive(Union)]
pub enum UploadedPluginInfoResponse {
    Response(PluginInfoNode),
    Error(UploadedPluginError),
}

// TODO central server only
pub fn uploaded_plugin_info(
    ctx: &Context<'_>,
    file_id: String,
) -> Result<UploadedPluginInfoResponse> {
    let service_provider = ctx.service_provider();
    let settings = ctx.get_settings();

    map_response(
        service_provider
            .plugin_service
            .get_uploaded_plugin_info(settings, UploadedFile { file_id }),
    )
}

pub fn map_response(
    from: Result<PluginBundle, UploadedFileJsonError>,
) -> Result<UploadedPluginInfoResponse> {
    let result = match from {
        Ok(plugin_bundle) => {
            UploadedPluginInfoResponse::Response(PluginInfoNode::from_domain(plugin_bundle))
        }
        Err(error) => UploadedPluginInfoResponse::Error(UploadedPluginError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: UploadedFileJsonError) -> Result<UploadedPluginErrorVariant> {
    use StandardGraphqlError::*;
    let formatted_error = format_error(&error);

    let graphql_error = match error {
        // Structured
        UploadedFileJsonError::CannotParseFile(_) => {
            return Ok(UploadedPluginErrorVariant::CannotParseFile)
        }
        // Internal
        UploadedFileJsonError::UploadedFileConversionError(_)
        | UploadedFileJsonError::ErrorWhileReadingFile(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

pub struct PluginInfoNode {
    pub bundle: PluginBundle,
}
impl PluginInfoNode {
    pub(crate) fn from_domain(bundle: PluginBundle) -> PluginInfoNode {
        PluginInfoNode { bundle }
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
                    .collect::<HashSet<serde_json::Value>>()

        })
    }
}
