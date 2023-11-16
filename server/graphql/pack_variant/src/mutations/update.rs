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
    pub item_id: String,
    pub short_name: String,
    pub long_name: String,
}

#[derive(Union)]
#[graphql(name = "UpdatePackVariantResponse")]
pub enum UpdatePackVariantResponse {
    Response(VariantNode),
}

pub fn update_pack_variant(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdatePackVariantInput,
) -> Result<UpdatePackVariantResponse> {
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

    map_resopnse(pack_variant_service.update_pack_variant(&service_context, input.to_domain()))
}

impl UpdatePackVariantInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdatePackVariantInput {
            id,
            item_id,
            short_name,
            long_name,
        } = self;

        ServiceInput {
            id,
            item_id,
            short_name,
            long_name,
        }
    }
}

fn map_resopnse(from: Result<PackVariantRow, ServiceError>) -> Result<UpdatePackVariantResponse> {
    match from {
        Ok(result) => Ok(UpdatePackVariantResponse::Response(
            VariantNode::from_domain(result),
        )),
        Err(error) => {
            use ServiceError::*;
            let formatted_error = format!("{:#?}", error);

            let graphql_error = match error {
                ItemDoesNotExist | PackVariantDoesNotExist => {
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
