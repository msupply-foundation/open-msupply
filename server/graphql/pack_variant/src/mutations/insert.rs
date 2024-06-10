use crate::mutations::{
    CannotAddPackSizeOfZero, CannotAddWithNoAbbreviationAndName,
    InsertPackVariantError as InsertError, InsertPackVariantErrorInterface as ErrorInterface,
    VariantWithPackSizeAlreadyExists,
};
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::VariantNode;
use repository::PackVariantRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    pack_variant::{InsertPackVariant as ServiceInput, InsertPackVariantError as ServiceError},
};

#[derive(InputObject)]
#[graphql(name = "InsertPackVariantInput")]
pub struct InsertPackVariantInput {
    pub id: String,
    pub item_id: String,
    pub short_name: String,
    pub long_name: String,
    pub pack_size: f64,
}

#[derive(Union)]
#[graphql(name = "InsertPackVariantResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(VariantNode),
}

pub fn insert_pack_variant(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertPackVariantInput,
) -> Result<InsertResponse> {
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

    map_response(pack_variant_service.insert_pack_variant(&service_context, input.to_domain()))
}

impl InsertPackVariantInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertPackVariantInput {
            id,
            item_id,
            short_name,
            long_name,
            pack_size,
        } = self;

        ServiceInput {
            id,
            item_id,
            short_name,
            long_name,
            pack_size,
        }
    }
}

fn map_response(from: Result<PackVariantRow, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(variant) => InsertResponse::Response(VariantNode::from_domain(variant)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<ErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::VariantWithPackSizeAlreadyExists => {
            return Ok(ErrorInterface::VariantWithPackSizeAlreadyExists(
                VariantWithPackSizeAlreadyExists,
            ))
        }
        ServiceError::CannotAddPackSizeOfZero => {
            return Ok(ErrorInterface::CannotAddPackSizeOfZero(
                CannotAddPackSizeOfZero,
            ))
        }
        ServiceError::CannotAddWithNoAbbreviationAndName => {
            return Ok(ErrorInterface::CannotAddWithNoAbbreviationAndName(
                CannotAddWithNoAbbreviationAndName,
            ))
        }

        ServiceError::ItemDoesNotExist | ServiceError::PackVariantAlreadyExists => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) | ServiceError::CreatedRecordNotFound => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
