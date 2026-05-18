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
    pub item_id: String,
    pub ancillary_item_id: String,
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

pub struct DuplicateAncillaryItem;
#[Object]
impl DuplicateAncillaryItem {
    pub async fn description(&self) -> &str {
        "An ancillary item link with the same principal and ancillary already exists"
    }
}

pub struct AncillaryCycleDetected;
#[Object]
impl AncillaryCycleDetected {
    pub async fn description(&self) -> &str {
        "Adding this link would create a cycle through existing ancillary item links"
    }
}

pub struct AncillaryMaxDepthExceeded {
    pub max: u32,
    pub actual: u32,
}
#[Object]
impl AncillaryMaxDepthExceeded {
    pub async fn description(&self) -> &str {
        "Adding this link would exceed the maximum allowed depth of ancillary item chains"
    }
    pub async fn max(&self) -> u32 {
        self.max
    }
    pub async fn actual(&self) -> u32 {
        self.actual
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpsertAncillaryItemErrorInterface {
    InternalError(InternalError),
    DatabaseError(DatabaseError),
    DuplicateAncillaryItem(DuplicateAncillaryItem),
    AncillaryCycleDetected(AncillaryCycleDetected),
    AncillaryMaxDepthExceeded(AncillaryMaxDepthExceeded),
}

pub async fn upsert_ancillary_item(
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

    let service_provider = ctx.service_provider_data();
    let domain_input = input.to_domain();

    let result = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        let service_context = service_provider.basic_context()?;
        Ok(service_provider
            .item_service
            .upsert_ancillary_item(&service_context, domain_input))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    map_response(result)
}

impl UpsertAncillaryItemInput {
    pub fn to_domain(self) -> UpsertAncillaryItem {
        let UpsertAncillaryItemInput {
            id,
            item_id,
            ancillary_item_id,
            item_quantity,
            ancillary_quantity,
        } = self;

        UpsertAncillaryItem {
            id,
            item_id,
            ancillary_item_id,
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
        // User-visible structured errors — surfaced as typed variants so the
        // client can render a translated message.
        ServiceError::DuplicateAncillaryItem => {
            return Ok(UpsertAncillaryItemErrorInterface::DuplicateAncillaryItem(
                DuplicateAncillaryItem,
            ))
        }
        ServiceError::CycleDetected => {
            return Ok(UpsertAncillaryItemErrorInterface::AncillaryCycleDetected(
                AncillaryCycleDetected,
            ))
        }
        ServiceError::MaxDepthExceeded { max, actual } => {
            return Ok(UpsertAncillaryItemErrorInterface::AncillaryMaxDepthExceeded(
                AncillaryMaxDepthExceeded { max, actual },
            ))
        }
        // Internal errors
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        // Bad user input that the UI prevents — surfaced via the standard GraphQL error path
        ServiceError::NotCentralServer => Forbidden(formatted_error),
        ServiceError::PrincipalItemDoesNotExist => BadUserInput(formatted_error),
        ServiceError::AncillaryItemDoesNotExist => BadUserInput(formatted_error),
        ServiceError::CanNotLinkItemWithItself => BadUserInput(formatted_error),
        ServiceError::RatioMustBePositive => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
