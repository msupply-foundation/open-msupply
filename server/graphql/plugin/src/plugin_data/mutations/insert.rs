use crate::types::PluginDataNode;
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::PluginData;
use service::{
    auth::{Resource, ResourceAccessRequest},
    plugin_data::{InsertPluginData as ServiceInput, InsertPluginDataError as ServiceError},
};

#[derive(InputObject)]
#[graphql(name = "InsertPluginDataInput")]
pub struct InsertPluginDataInput {
    pub id: String,
    pub store_id: Option<String>,
    pub plugin_code: String,
    pub related_record_id: Option<String>,
    pub data_identifier: String,
    pub data: String,
}

#[derive(Union)]
#[graphql(name = "InsertPluginDataResponse")]
pub enum InsertResponse {
    Response(PluginDataNode),
}

#[derive(SimpleObject)]
pub struct InsertPluginDataError {
    pub error: String,
}

pub fn insert_plugin_data(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertPluginDataInput,
) -> Result<InsertResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePluginData,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), "".to_string())?;
    map_response(
        service_provider
            .plugin_data_service
            .insert(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<PluginData, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(plugin_data) => InsertResponse::Response(PluginDataNode::from_domain(plugin_data)),
        Err(error) => return map_error(error),
    };

    Ok(result)
}

pub fn map_error(error: ServiceError) -> Result<InsertResponse> {
    use ServiceError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        PluginDataAlreadyExists | NewlyCreatedPluginDataDoesNotExist => {
            StandardGraphqlError::BadUserInput(formatted_error)
        }
        DatabaseError(_) | InternalError(_) => StandardGraphqlError::InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl InsertPluginDataInput {
    pub fn to_domain(self) -> ServiceInput {
        ServiceInput {
            id: self.id,
            store_id: self.store_id,
            plugin_code: self.plugin_code,
            related_record_id: self.related_record_id,
            data_identifier: self.data_identifier,
            data: self.data,
        }
    }
}
