use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use repository::{StockRelocation, StockRelocationRow};
use service::auth::{Resource, ResourceAccessRequest};
use service::stock_relocation::update::{
    UpdateStockRelocation as ServiceInput, UpdateStockRelocationError as ServiceError,
};
use service::stock_relocation::validate::ValidateMovementError;

use super::{LocationOnHold, NotEnoughStock};
use crate::types::{StockRelocationNode, StockRelocationNodeStatus};

#[derive(InputObject)]
#[graphql(name = "UpdateStockRelocationInput")]
pub struct UpdateInput {
    pub id: String,
    pub comment: Option<String>,
    pub status: Option<StockRelocationNodeStatus>,
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            comment,
            status,
        } = self;
        ServiceInput {
            id,
            comment,
            status: status.map(|status| status.into()),
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateStockRelocationError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateStockRelocationResponse")]
pub enum UpdateResponse {
    Response(StockRelocationNode),
    Error(UpdateError),
}

#[derive(Interface)]
#[graphql(name = "UpdateStockRelocationErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateErrorInterface {
    NotEnoughStock(NotEnoughStock),
    LocationOnHold(LocationOnHold),
}

pub fn update_stock_relocation(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateInput,
) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .stock_relocation_service
        .update_stock_relocation(&service_context, store_id, input.to_domain())
    {
        Ok(row) => Ok(UpdateResponse::Response(node(row))),
        Err(error) => Ok(UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        })),
    }
}

fn node(row: StockRelocationRow) -> StockRelocationNode {
    StockRelocationNode::from_domain(StockRelocation {
        stock_relocation_row: row,
    })
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use ServiceError as E;
    use ValidateMovementError as V;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        E::LineValidation {
            error: V::NotEnoughStock(stock_line_id),
            ..
        } => {
            return Ok(UpdateErrorInterface::NotEnoughStock(NotEnoughStock {
                stock_line_id,
            }))
        }
        E::LineValidation {
            error: V::SourceLocationOnHold(location_id) | V::DestinationLocationOnHold(location_id),
            ..
        } => {
            return Ok(UpdateErrorInterface::LocationOnHold(LocationOnHold {
                location_id,
            }))
        }
        E::StockRelocationDoesNotExist
        | E::NotThisStoreRelocation
        | E::StockRelocationFinalised
        | E::MovementHasNoLines
        | E::LineValidation { .. } => BadUserInput(formatted_error),
        E::UpdateStockLine(_) | E::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
