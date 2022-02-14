use async_graphql::*;
use chrono::NaiveDate;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake_line::insert::{
        InsertStocktakeLineError, InsertStocktakeLineInput as InsertStocktakeLine,
    },
};

use crate::{
    schema::types::StocktakeLineNode,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

#[derive(InputObject)]
pub struct InsertStocktakeLineInput {
    pub id: String,
    pub stocktake_id: String,
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub counted_number_of_packs: Option<u32>,

    pub item_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<u32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
}

#[derive(Union)]
pub enum InsertStocktakeLineResponse {
    Response(StocktakeLineNode),
}

pub fn insert_stocktake_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertStocktakeLineInput,
) -> Result<InsertStocktakeLineResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    do_insert_stocktake_line(&service_ctx, service_provider, store_id, input)
}

pub fn do_insert_stocktake_line(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: InsertStocktakeLineInput,
) -> Result<InsertStocktakeLineResponse> {
    let service = &service_provider.stocktake_line_service;
    let id = input.id.clone();
    match service.insert_stocktake_line(&service_ctx, store_id, to_domain(input)) {
        Ok(line) => Ok(InsertStocktakeLineResponse::Response(StocktakeLineNode {
            line,
        })),
        Err(err) => {
            let formatted_error = format!("Insert stocktake line {}: {:#?}", id, err);
            let graphql_error = match err {
                InsertStocktakeLineError::DatabaseError(err) => err.into(),
                InsertStocktakeLineError::InternalError(err) => {
                    StandardGraphqlError::InternalError(err)
                }
                InsertStocktakeLineError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StocktakeDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StocktakeLineAlreadyExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StockLineDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StockLineAlreadyExistsInStocktake => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::LocationDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StockLineXOrItem => {
                    StandardGraphqlError::BadUserInput(format!(
                        "Either a stock line id or item id must be set (not both), {:#?}",
                        err
                    ))
                }
                InsertStocktakeLineError::ItemDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

fn to_domain(
    InsertStocktakeLineInput {
        id,
        stocktake_id,
        stock_line_id,
        location_id,
        comment,
        counted_number_of_packs,
        item_id,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }: InsertStocktakeLineInput,
) -> InsertStocktakeLine {
    InsertStocktakeLine {
        id,
        stocktake_id,
        stock_line_id,
        location_id,
        comment,
        counted_number_of_packs,
        item_id,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }
}
