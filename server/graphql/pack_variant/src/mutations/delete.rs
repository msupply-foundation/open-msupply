use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse;
use service::auth::{Resource, ResourceAccessRequest};
use service::pack_variant::{
    DeletePackVariant as ServiceInput, DeletePackVariantError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "DeletePackVariantInput")]
pub struct DeletePackVariantInput {
    pub id: String,
}

#[derive(Union)]
#[graphql(name = "DeletePackVariantResponse")]
pub enum DeletePackVariantResponse {
    Response(DeleteResponse),
}

pub fn delete_pack_variant(
    ctx: &Context<'_>,
    store_id: String,
    input: DeletePackVariantInput,
) -> Result<DeletePackVariantResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateItemNamesCodesAndUnits,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let pack_variant_service = &service_provider.pack_variant_service;

    map_response(pack_variant_service.delete_pack_variant(&service_context, input.to_domain()))
}

impl DeletePackVariantInput {
    pub fn to_domain(self) -> ServiceInput {
        let DeletePackVariantInput { id } = self;

        ServiceInput { id }
    }
}

fn map_response(from: Result<String, ServiceError>) -> Result<DeletePackVariantResponse> {
    match from {
        Ok(result) => Ok(DeletePackVariantResponse::Response(DeleteResponse(result))),
        Err(error) => {
            use ServiceError::*;
            let formatted_error = format!("{:#?}", error);

            let graphql_error = match error {
                CouldNotDeletePackVariant | PackVariantDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                ServiceError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };

            Err(graphql_error.extend())
        }
    }
}
