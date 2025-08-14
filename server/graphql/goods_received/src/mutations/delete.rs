use async_graphql::*;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::auth::{Resource, ResourceAccessRequest};
use service::goods_received::DeleteGoodsReceivedError as ServiceError;

#[derive(Union)]
#[graphql(name = "DeleteGoodsReceivedResponse")]
pub enum DeleteResponse {
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, id: String) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateGoodsReceived,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .goods_received_service
            .delete_goods_received(&service_context, &id),
    )
}

pub fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(id) => DeleteResponse::Response(GenericDeleteResponse(id)),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = match error {
                ServiceError::GoodsReceivedDoesNotExist
                | ServiceError::NotThisStoreGoodsReceived
                | ServiceError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                ServiceError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(graphql_error.extend());
        }
    };

    Ok(result)
}
