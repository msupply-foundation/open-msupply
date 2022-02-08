use async_graphql::*;
use chrono::NaiveDate;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stock_take_line::insert::{
        InsertStockTakeLineError, InsertStockTakeLineInput as InsertStockTakeLine,
    },
};

use crate::{
    schema::types::StockTakeLineNode,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

#[derive(InputObject)]
pub struct InsertStockTakeLineInput {
    pub id: String,
    pub stock_take_id: String,
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
pub enum InsertStockTakeLineResponse {
    Response(StockTakeLineNode),
}

pub fn insert_stock_take_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertStockTakeLineInput,
) -> Result<InsertStockTakeLineResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::InsertStockTakeLine,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    do_insert_stock_take_line(&service_ctx, service_provider, store_id, input)
}

pub fn do_insert_stock_take_line(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: InsertStockTakeLineInput,
) -> Result<InsertStockTakeLineResponse> {
    let service = &service_provider.stock_take_line_service;
    match service.insert_stock_take_line(&service_ctx, store_id, to_domain(input)) {
        Ok(line) => Ok(InsertStockTakeLineResponse::Response(StockTakeLineNode {
            line,
        })),
        Err(err) => {
            let formatted_error = format!("{:#?}", err);
            let graphql_error = match err {
                InsertStockTakeLineError::DatabaseError(err) => err.into(),
                InsertStockTakeLineError::InternalError(err) => {
                    StandardGraphqlError::InternalError(err)
                }
                InsertStockTakeLineError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStockTakeLineError::StockTakeDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStockTakeLineError::StockTakeLineAlreadyExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStockTakeLineError::StockLineDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStockTakeLineError::StockLineAlreadyExistsInStockTake => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStockTakeLineError::LocationDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStockTakeLineError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStockTakeLineError::StockLineXOrItem => {
                    StandardGraphqlError::BadUserInput(format!(
                        "Either a stock line id or item id must be set (not both), {:#?}",
                        err
                    ))
                }
                InsertStockTakeLineError::ItemDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

fn to_domain(
    InsertStockTakeLineInput {
        id,
        stock_take_id,
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
    }: InsertStockTakeLineInput,
) -> InsertStockTakeLine {
    InsertStockTakeLine {
        id,
        stock_take_id,
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
