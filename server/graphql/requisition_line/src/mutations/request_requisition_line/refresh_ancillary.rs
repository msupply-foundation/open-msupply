use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditRequisition, ForeignKey, ForeignKeyError},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::RequisitionLineNode;
use repository::RequisitionLineRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition_line::ancillary_items::{
        RefreshAncillaryAction as ServiceAction, RefreshAncillaryItems as ServiceInput,
        RefreshAncillaryItemsError as ServiceError,
    },
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum RefreshAncillaryItemsAction {
    /// Insert lines for every ancillary item that's missing from the requisition.
    Add,
    /// Overwrite the quantity on every existing ancillary line whose quantity is stale.
    Update,
}

impl From<RefreshAncillaryItemsAction> for ServiceAction {
    fn from(a: RefreshAncillaryItemsAction) -> Self {
        match a {
            RefreshAncillaryItemsAction::Add => ServiceAction::Add,
            RefreshAncillaryItemsAction::Update => ServiceAction::Update,
        }
    }
}

#[derive(InputObject)]
pub struct RefreshAncillaryItemsInput {
    pub requisition_id: String,
    pub action: RefreshAncillaryItemsAction,
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum RefreshAncillaryItemsErrorInterface {
    RequisitionDoesNotExist(ForeignKeyError),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
pub struct RefreshAncillaryItemsError {
    pub error: RefreshAncillaryItemsErrorInterface,
}

#[derive(SimpleObject)]
pub struct RefreshAncillaryItemsSuccess {
    /// Lines that were inserted (Add) or whose quantity was updated (Update).
    pub lines: Vec<RequisitionLineNode>,
}

#[derive(Union)]
pub enum RefreshAncillaryItemsResponse {
    Error(RefreshAncillaryItemsError),
    Response(RefreshAncillaryItemsSuccess),
}

pub fn refresh_ancillary_items(
    ctx: &Context<'_>,
    store_id: &str,
    input: RefreshAncillaryItemsInput,
) -> Result<RefreshAncillaryItemsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let service_input = ServiceInput {
        requisition_id: input.requisition_id,
        action: input.action.into(),
    };

    map_response(
        service_provider
            .requisition_line_service
            .refresh_ancillary_items(&service_context, service_input),
    )
}

fn map_response(
    from: Result<Vec<RequisitionLineRow>, ServiceError>,
) -> Result<RefreshAncillaryItemsResponse> {
    match from {
        Ok(rows) => {
            // GraphQL RequisitionLineNode wants a `RequisitionLine` (with joined rows),
            // but the refresh path only has bare `RequisitionLineRow`s to return. We
            // hydrate them as minimally as the node needs — the client re-queries the
            // requisition after this mutation anyway, so callers see the fresh state
            // via the re-query rather than this mutation's result payload.
            let lines = rows
                .into_iter()
                .map(|row| {
                    RequisitionLineNode::from_domain(repository::RequisitionLine {
                        requisition_line_row: row,
                        requisition_row: Default::default(),
                        item_row: Default::default(),
                    })
                })
                .collect();
            Ok(RefreshAncillaryItemsResponse::Response(
                RefreshAncillaryItemsSuccess { lines },
            ))
        }
        Err(error) => Ok(RefreshAncillaryItemsResponse::Error(
            RefreshAncillaryItemsError {
                error: map_error(error)?,
            },
        )),
    }
}

fn map_error(error: ServiceError) -> Result<RefreshAncillaryItemsErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");
    let graphql_error = match error {
        ServiceError::RequisitionDoesNotExist => {
            return Ok(RefreshAncillaryItemsErrorInterface::RequisitionDoesNotExist(
                ForeignKeyError(ForeignKey::RequisitionId),
            ))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(RefreshAncillaryItemsErrorInterface::CannotEditRequisition(
                CannotEditRequisition {},
            ))
        }
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::CannotGenerateAncillaryLine(_) => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };
    Err(graphql_error.extend())
}
