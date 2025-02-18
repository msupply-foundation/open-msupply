use crate::types::PluginDataNode;
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::PluginData;
use service::{
    auth::{Resource, ResourceAccessRequest},
    plugin_data::{UpdatePluginData as ServiceInput, UpdatePluginDataError as ServiceError},
};

#[derive(InputObject)]
#[graphql(name = "UpdatePluginDataInput")]
pub struct UpdatePluginDataInput {
    pub id: String,
    pub store_id: Option<String>,
    pub plugin_code: String,
    pub related_record_id: Option<String>,
    pub data_identifier: String,
    pub data: String,
}

#[derive(Union)]
#[graphql(name = "UpdatePluginDataResponse")]
pub enum UpdateResponse {
    Response(PluginDataNode),
}

#[derive(SimpleObject)]
pub struct UpdatePluginDataError {
    pub error: String,
}

pub fn update_plugin_data(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdatePluginDataInput,
) -> Result<UpdateResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            store_id: Some(store_id.to_string()),
            resource: Resource::MutatePluginData,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), "".to_string())?;
    map_response(
        service_provider
            .plugin_data_service
            .update(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<PluginData, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(plugin_data) => UpdateResponse::Response(PluginDataNode::from_domain(plugin_data)),
        Err(error) => return map_error(error),
    };

    Ok(result)
}

pub fn map_error(error: ServiceError) -> Result<UpdateResponse> {
    use ServiceError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        PluginDataDoesNotExist
        | RelatedRecordDoesNotMatch
        | RelatedRecordTypeDoesNotMatch
        | PluginNameDoesNotMatch => StandardGraphqlError::BadUserInput(formatted_error),
        DatabaseError(_) | InternalError(_) => StandardGraphqlError::InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdatePluginDataInput {
    pub fn to_domain(self) -> ServiceInput {
        ServiceInput {
            id: self.id,
            store_id: self.store_id,
            plugin_name: self.plugin_name,
            related_record_id: self.related_record_id,
            data_identifier: self.data_identifier,
            data: self.data,
        }
    }
}
