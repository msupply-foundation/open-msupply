use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_types::types::DeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::item_variant::{DeleteItemVariant, DeleteItemVariantError},
};

#[derive(InputObject)]
pub struct DeleteItemVariantInput {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteItemVariantResponse {
    Response(DeleteResponse),
}

pub fn delete_item_variant(
    ctx: &Context<'_>,
    store_id: String,
    input: DeleteItemVariantInput,
) -> Result<DeleteItemVariantResponse> {
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
        .delete_item_variant(&service_context, input.to_domain());

    map_response(result)
}

impl DeleteItemVariantInput {
    pub fn to_domain(self) -> DeleteItemVariant {
        let DeleteItemVariantInput { id } = self;

        DeleteItemVariant { id }
    }
}

fn map_response(from: Result<String, DeleteItemVariantError>) -> Result<DeleteItemVariantResponse> {
    match from {
        Ok(result) => Ok(DeleteItemVariantResponse::Response(DeleteResponse(result))),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);

            let graphql_error = match error {
                DeleteItemVariantError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };

            Err(graphql_error.extend())
        }
    }
}
