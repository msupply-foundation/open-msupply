use crate::{standard_graphql_error::StandardGraphqlError, ContextExt};

use async_graphql::*;
use chrono::NaiveDateTime;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    stock_take::insert::{
        InsertStockTakeError as ServiceError, InsertStockTakeInput as InsertStockTake,
    },
};

use super::StockTakeNode;

#[derive(InputObject)]
pub struct InsertStockTakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub created_datetime: NaiveDateTime,
}

#[derive(SimpleObject)]
pub struct InsertStockTakeNode {
    pub stock_take: StockTakeNode,
}

#[derive(Union)]
pub enum InsertStockTakeResponse {
    Response(InsertStockTakeNode),
}

pub fn insert_stock_take(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertStockTakeInput,
) -> Result<InsertStockTakeResponse, StandardGraphqlError> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    service_provider.validation_service.validate(
        &service_ctx,
        ctx.get_auth_data(),
        &ctx.get_auth_token(),
        &ResourceAccessRequest {
            resource: Resource::InsertStockTake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service = &service_provider.stock_take_service;
    match service.insert_stock_take(&service_ctx, store_id, to_domain(input)) {
        Ok(stock_take) => Ok(InsertStockTakeResponse::Response(InsertStockTakeNode {
            stock_take: StockTakeNode { stock_take },
        })),
        Err(err) => match err {
            ServiceError::DatabaseError(err) => Err(err.into()),
            ServiceError::InternalError(err) => Err(StandardGraphqlError::InternalError(err)),
            ServiceError::InvalidStore => {
                Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
            }
            ServiceError::StockTakeAlreadyExists => {
                Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
            }
        },
    }
}

fn to_domain(
    InsertStockTakeInput {
        id,
        comment,
        description,
        created_datetime,
    }: InsertStockTakeInput,
) -> InsertStockTake {
    InsertStockTake {
        id,
        comment,
        description,
        created_datetime,
    }
}
