use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use repository::{StockRelocation, StockRelocationRow};
use service::auth::{Resource, ResourceAccessRequest};
use service::stock_relocation::insert::{
    InsertStockRelocation as ServiceInput, InsertStockRelocationError as ServiceError,
};

use crate::types::StockRelocationNode;

#[derive(InputObject)]
#[graphql(name = "InsertStockRelocationInput")]
pub struct InsertInput {
    pub id: String,
    pub comment: Option<String>,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput { id, comment } = self;
        ServiceInput { id, comment }
    }
}

#[derive(Union)]
#[graphql(name = "InsertStockRelocationResponse")]
pub enum InsertResponse {
    Response(StockRelocationNode),
}

pub fn insert_stock_relocation(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .stock_relocation_service
            .insert_stock_relocation(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<StockRelocationRow, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(stock_relocation_row) => Ok(InsertResponse::Response(StockRelocationNode::from_domain(
            StockRelocation {
                stock_relocation_row,
            },
        ))),
        Err(error) => Err(map_error(error)),
    }
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    let formatted_error = format!("{error:#?}");
    match error {
        ServiceError::StockRelocationAlreadyExists => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    }
    .extend()
}
