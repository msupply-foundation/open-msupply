use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::AncillaryItemNode;
use repository::ancillary_item_row::AncillaryItemRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::ancillary_item::{UpsertAncillaryItem, UpsertAncillaryItemError as ServiceError},
};

#[derive(InputObject)]
pub struct UpsertAncillaryItemInput {
    pub id: String,
    pub item_link_id: String,
    pub ancillary_item_link_id: String,
    /// Left-hand side of the user-entered `x:y` ratio (principal count).
    pub item_quantity: f64,
    /// Right-hand side of the user-entered `x:y` ratio (ancillary count).
    pub ancillary_quantity: f64,
}

#[derive(SimpleObject)]
pub struct UpsertAncillaryItemError {
    pub error: UpsertAncillaryItemErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpsertAncillaryItemResponse")]
pub enum UpsertAncillaryItemResponse {
    Error(UpsertAncillaryItemError),
    Response(AncillaryItemNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpsertAncillaryItemErrorInterface {
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

pub fn upsert_ancillary_item(
    ctx: &Context<'_>,
    store_id: String,
    input: UpsertAncillaryItemInput,
) -> Result<UpsertAncillaryItemResponse> {
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
        .upsert_ancillary_item(&service_context, input.to_domain());

    map_response(result)
}

impl UpsertAncillaryItemInput {
    pub fn to_domain(self) -> UpsertAncillaryItem {
        let UpsertAncillaryItemInput {
            id,
            item_link_id,
            ancillary_item_link_id,
            item_quantity,
            ancillary_quantity,
        } = self;

        UpsertAncillaryItem {
            id,
            item_link_id,
            ancillary_item_link_id,
            item_quantity,
            ancillary_quantity,
        }
    }
}

fn map_response(
    from: Result<AncillaryItemRow, ServiceError>,
) -> Result<UpsertAncillaryItemResponse> {
    let result = match from {
        Ok(row) => UpsertAncillaryItemResponse::Response(AncillaryItemNode::from_domain(row)),
        Err(error) => UpsertAncillaryItemResponse::Error(UpsertAncillaryItemError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpsertAncillaryItemErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Internal errors
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        // Bad user input — surfaced via the standard GraphQL error path
        ServiceError::NotCentralServer => Forbidden(formatted_error),
        ServiceError::PrincipalItemDoesNotExist => BadUserInput(formatted_error),
        ServiceError::AncillaryItemDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DuplicateAncillaryItem => BadUserInput(formatted_error),
        ServiceError::CanNotLinkItemWithItself => BadUserInput(formatted_error),
        ServiceError::CycleDetected => BadUserInput(formatted_error),
        ServiceError::MaxDepthExceeded { max, actual } => BadUserInput(format!(
            "Ancillary item link would exceed max depth of {max} (would be {actual})"
        )),
        ServiceError::RatioMustBePositive => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
