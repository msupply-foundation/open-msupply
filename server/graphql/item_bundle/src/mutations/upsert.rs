use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::BundledItemNode;
use repository::item_variant::bundled_item_row::BundledItemRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::bundled_item::{UpsertBundledItem, UpsertBundledItemError as ServiceError},
};

#[derive(InputObject)]
pub struct UpsertBundledItemInput {
    pub id: String,
    pub principal_item_variant_id: String,
    pub bundled_item_variant_id: String,
    pub ratio: f64,
}

#[derive(SimpleObject)]
pub struct UpsertBundledItemError {
    pub error: UpsertBundledItemErrorInterface,
}
#[derive(Union)]
#[graphql(name = "UpsertBundledItemResponse")]
pub enum UpsertBundledItemResponse {
    Error(UpsertBundledItemError),
    Response(BundledItemNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpsertBundledItemErrorInterface {
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

pub fn upsert_bundled_item(
    ctx: &Context<'_>,
    store_id: String,
    input: UpsertBundledItemInput,
) -> Result<UpsertBundledItemResponse> {
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
        .upsert_bundled_item(&service_context, input.to_domain());

    map_response(result)
}

impl UpsertBundledItemInput {
    pub fn to_domain(self) -> UpsertBundledItem {
        let UpsertBundledItemInput {
            id,
            principal_item_variant_id: item_id,
            bundled_item_variant_id,
            ratio,
        } = self;

        UpsertBundledItem {
            id: id.clone(),
            principal_item_variant_id: item_id.clone(),
            bundled_item_variant_id: bundled_item_variant_id.clone(),
            ratio,
        }
    }
}

fn map_response(from: Result<BundledItemRow, ServiceError>) -> Result<UpsertBundledItemResponse> {
    let result = match from {
        Ok(variant) => UpsertBundledItemResponse::Response(BundledItemNode::from_domain(variant)),
        Err(error) => UpsertBundledItemResponse::Error(UpsertBundledItemError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpsertBundledItemErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_repository_error) => InternalError(formatted_error),
        ServiceError::PrincipalItemDoesNotExist => BadUserInput(formatted_error),
        ServiceError::BundledItemDoesNotExist => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
