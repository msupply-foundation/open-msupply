use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::bundled_item::{DeleteBundledItem, DeleteBundledItemError},
};

#[derive(InputObject)]
pub struct DeleteBundledItemInput {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteBundledItemResponse {
    Response(DeleteResponse),
}

pub fn delete_bundled_item(
    ctx: &Context<'_>,
    store_id: String,
    input: DeleteBundledItemInput,
) -> Result<DeleteBundledItemResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateItemNamesCodesAndUnits,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .item_service
        .delete_bundled_item(&service_context, input.to_domain());

    map_response(result)
}

impl DeleteBundledItemInput {
    pub fn to_domain(self) -> DeleteBundledItem {
        let DeleteBundledItemInput { id } = self;

        DeleteBundledItem { id }
    }
}

fn map_response(from: Result<String, DeleteBundledItemError>) -> Result<DeleteBundledItemResponse> {
    match from {
        Ok(result) => Ok(DeleteBundledItemResponse::Response(DeleteResponse(result))),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);

            let graphql_error = match error {
                DeleteBundledItemError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };

            Err(graphql_error.extend())
        }
    }
}
