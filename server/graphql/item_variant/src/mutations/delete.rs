use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
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

pub async fn delete_item_variant(
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

    let service_provider = ctx.service_provider_data();
    let domain_input = input.to_domain();

    let result = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        let service_context = service_provider.basic_context()?;
        Ok(service_provider
            .item_service
            .delete_item_variant(&service_context, domain_input))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

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
            let formatted_error = format!("{error:#?}");

            let graphql_error = match error {
                DeleteItemVariantError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };

            Err(graphql_error.extend())
        }
    }
}
