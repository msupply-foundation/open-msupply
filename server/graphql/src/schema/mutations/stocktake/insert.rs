use crate::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use async_graphql::*;
use chrono::NaiveDateTime;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake::insert::{
        InsertStocktakeError as ServiceError, InsertStocktakeInput as InsertStocktake,
    },
};

use super::StocktakeNode;

#[derive(InputObject)]
pub struct InsertStocktakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub created_datetime: NaiveDateTime,
}

#[derive(Union)]
pub enum InsertStocktakeResponse {
    Response(StocktakeNode),
}

pub fn insert_stocktake(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertStocktakeInput,
) -> Result<InsertStocktakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::InsertStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_insert_stocktake(&service_ctx, service_provider, store_id, input)
}

pub fn do_insert_stocktake(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: InsertStocktakeInput,
) -> Result<InsertStocktakeResponse> {
    let service = &service_provider.stocktake_service;
    let id = input.id.clone();
    match service.insert_stocktake(&service_ctx, store_id, to_domain(input)) {
        Ok(stocktake) => Ok(InsertStocktakeResponse::Response(StocktakeNode {
            stocktake,
        })),
        Err(err) => {
            let formatted_error = format!("Insert stocktake {}: {:#?}", id, err);
            let graphql_error = match err {
                ServiceError::DatabaseError(err) => err.into(),
                ServiceError::InternalError(err) => StandardGraphqlError::InternalError(err),
                ServiceError::InvalidStore => StandardGraphqlError::BadUserInput(formatted_error),
                ServiceError::StocktakeAlreadyExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

fn to_domain(
    InsertStocktakeInput {
        id,
        comment,
        description,
        created_datetime,
    }: InsertStocktakeInput,
) -> InsertStocktake {
    InsertStocktake {
        id,
        comment,
        description,
        created_datetime,
    }
}
