use crate::mutations::{
    CannotAddWithNoAbbreviationAndName, UpdatePackVariantError as UpdateError,
    UpdatePackVariantErrorInterface as ErrorInterface,
};
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::VariantNode;
use repository::PackVariantRow;
use service::auth::{Resource, ResourceAccessRequest};
use service::pack_variant::{
    UpdatePackVariant as ServiceInput, UpdatePackVariantError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "UpdatePackVariantInput")]
pub struct UpdatePackVariantInput {
    pub id: String,
    pub short_name: String,
    pub long_name: String,
}

#[derive(Union)]
#[graphql(name = "UpdatePackVariantResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(VariantNode),
}

pub fn update_pack_variant(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdatePackVariantInput,
) -> Result<UpdateResponse> {
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

    map_response(pack_variant_service.update_pack_variant(&service_context, input.to_domain()))
}

impl UpdatePackVariantInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdatePackVariantInput {
            id,
            short_name,
            long_name,
        } = self;

        ServiceInput {
            id,
            short_name,
            long_name,
        }
    }
}

fn map_response(from: Result<PackVariantRow, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(variant) => UpdateResponse::Response(VariantNode::from_domain(variant)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<ErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::CannotHaveNoAbbreviationAndName => {
            return Ok(ErrorInterface::CannotAddWithNoAbbreviationAndName(
                CannotAddWithNoAbbreviationAndName,
            ))
        }

        ServiceError::PackVariantDoesNotExist | ServiceError::UpdatedRecordNotFound => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
