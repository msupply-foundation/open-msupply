use crate::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use async_graphql::*;
use chrono::NaiveDateTime;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
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

#[derive(Union)]
pub enum InsertStockTakeResponse {
    Response(StockTakeNode),
}

pub fn insert_stock_take(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertStockTakeInput,
) -> Result<InsertStockTakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::InsertStockTake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_insert_stock_take(&service_ctx, service_provider, store_id, input)
}

pub fn do_insert_stock_take(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: InsertStockTakeInput,
) -> Result<InsertStockTakeResponse> {
    let service = &service_provider.stock_take_service;
    match service.insert_stock_take(&service_ctx, store_id, to_domain(input)) {
        Ok(stock_take) => Ok(InsertStockTakeResponse::Response(StockTakeNode {
            stock_take,
        })),
        Err(err) => {
            let formatted_error = format!("{:#?}", err);
            let graphql_error = match err {
                ServiceError::DatabaseError(err) => err.into(),
                ServiceError::InternalError(err) => StandardGraphqlError::InternalError(err),
                ServiceError::InvalidStore => StandardGraphqlError::BadUserInput(formatted_error),
                ServiceError::StockTakeAlreadyExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
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
