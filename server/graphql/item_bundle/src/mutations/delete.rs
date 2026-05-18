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

pub async fn delete_bundled_item(
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

    let service_provider = ctx.service_provider_data();
    let domain_input = input.to_domain();

    let result = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        let service_context = service_provider.basic_context()?;
        Ok(service_provider
            .item_service
            .delete_bundled_item(&service_context, domain_input))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

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
            let formatted_error = format!("{error:#?}");

            let graphql_error = match error {
                DeleteBundledItemError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };

            Err(graphql_error.extend())
        }
    }
}
