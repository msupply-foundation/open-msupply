use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::ancillary_item::{DeleteAncillaryItem, DeleteAncillaryItemError},
};

#[derive(InputObject)]
pub struct DeleteAncillaryItemInput {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteAncillaryItemResponse {
    Response(DeleteResponse),
}

pub async fn delete_ancillary_item(
    ctx: &Context<'_>,
    store_id: String,
    input: DeleteAncillaryItemInput,
) -> Result<DeleteAncillaryItemResponse> {
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
            .delete_ancillary_item(&service_context, domain_input))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    map_response(result)
}

impl DeleteAncillaryItemInput {
    pub fn to_domain(self) -> DeleteAncillaryItem {
        let DeleteAncillaryItemInput { id } = self;
        DeleteAncillaryItem { id }
    }
}

fn map_response(
    from: Result<String, DeleteAncillaryItemError>,
) -> Result<DeleteAncillaryItemResponse> {
    match from {
        Ok(result) => Ok(DeleteAncillaryItemResponse::Response(DeleteResponse(result))),
        Err(error) => {
            let formatted_error = format!("{error:#?}");

            let graphql_error = match error {
                DeleteAncillaryItemError::NotCentralServer => {
                    StandardGraphqlError::Forbidden(formatted_error)
                }
                DeleteAncillaryItemError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };

            Err(graphql_error.extend())
        }
    }
}
