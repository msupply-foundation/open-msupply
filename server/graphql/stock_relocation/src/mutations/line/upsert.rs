use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use service::auth::{Resource, ResourceAccessRequest};
use service::stock_relocation::validate::ValidateMovementError;
use service::stock_relocation_line::{
    UpsertStockRelocationLine as UpsertServiceInput,
    UpsertStockRelocationLineError as UpsertServiceError,
};

use crate::mutations::{LocationOnHold, NotEnoughStock};
use crate::types::StockRelocationLineNode;

#[derive(InputObject)]
#[graphql(name = "UpsertStockRelocationLineInput")]
pub struct UpsertLineInput {
    pub id: String,
    pub stock_relocation_id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub destination_location_id: Option<String>,
}

impl UpsertLineInput {
    pub fn to_domain(self) -> UpsertServiceInput {
        let UpsertLineInput {
            id,
            stock_relocation_id,
            stock_line_id,
            number_of_packs,
            destination_location_id,
        } = self;
        UpsertServiceInput {
            id,
            stock_relocation_id,
            stock_line_id,
            number_of_packs,
            destination_location_id,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "UpsertStockRelocationLineError")]
pub struct UpsertLineError {
    pub error: UpsertLineErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpsertStockRelocationLineResponse")]
pub enum UpsertLineResponse {
    Response(StockRelocationLineNode),
    Error(UpsertLineError),
}

#[derive(Interface)]
#[graphql(name = "UpsertStockRelocationLineErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpsertLineErrorInterface {
    NotEnoughStock(NotEnoughStock),
    LocationOnHold(LocationOnHold),
}

pub fn upsert_stock_relocation_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpsertLineInput,
) -> Result<UpsertLineResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_upsert_response(
        service_provider
            .stock_relocation_service
            .upsert_stock_relocation_line(&service_context, store_id, input.to_domain()),
    )
}

pub fn map_upsert_response(
    result: Result<repository::StockRelocationLineRow, UpsertServiceError>,
) -> Result<UpsertLineResponse> {
    match result {
        Ok(line) => Ok(UpsertLineResponse::Response(
            StockRelocationLineNode::from_domain(line),
        )),
        Err(error) => Ok(UpsertLineResponse::Error(UpsertLineError {
            error: map_upsert_error(error)?,
        })),
    }
}

fn map_upsert_error(error: UpsertServiceError) -> Result<UpsertLineErrorInterface> {
    use UpsertServiceError as E;
    use ValidateMovementError as V;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        E::ValidateMovement(V::NotEnoughStock(stock_line_id)) => {
            return Ok(UpsertLineErrorInterface::NotEnoughStock(NotEnoughStock {
                stock_line_id,
            }))
        }
        E::ValidateMovement(
            V::SourceLocationOnHold(location_id) | V::DestinationLocationOnHold(location_id),
        ) => {
            return Ok(UpsertLineErrorInterface::LocationOnHold(LocationOnHold {
                location_id,
            }))
        }
        E::StockRelocationDoesNotExist
        | E::NotThisStoreRelocation
        | E::StockRelocationFinalised
        | E::ValidateMovement(_) => BadUserInput(formatted_error),
        E::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
