use async_graphql::*;
use chrono::NaiveDate;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    stock_take_line::insert::{
        InsertStockTakeLineError, InsertStockTakeLineInput as InsertStockTakeLine,
    },
};

use crate::{
    schema::types::StockTakeLineNode, standard_graphql_error::StandardGraphqlError, ContextExt,
};

#[derive(InputObject)]
pub struct InsertStockTakeLineInput {
    pub id: String,
    pub stock_take_id: String,
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub counted_number_of_packs: Option<i32>,

    pub item_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<i32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
}

#[derive(SimpleObject)]
pub struct InsertStockTakeLineNode {
    pub stock_take_line: StockTakeLineNode,
}

#[derive(Union)]
pub enum InsertStockTakeLineResponse {
    Response(InsertStockTakeLineNode),
}

pub fn insert_stock_take_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertStockTakeLineInput,
) -> Result<InsertStockTakeLineResponse, StandardGraphqlError> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    service_provider.validation_service.validate(
        &service_ctx,
        ctx.get_auth_data(),
        &ctx.get_auth_token(),
        &ResourceAccessRequest {
            resource: Resource::InsertStockTakeLine,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service = &service_provider.stock_take_line_service;
    match service.insert_stock_take_line(&service_ctx, store_id, to_domain(input)) {
        Ok(line) => Ok(InsertStockTakeLineResponse::Response(
            InsertStockTakeLineNode {
                stock_take_line: StockTakeLineNode { line },
            },
        )),
        Err(err) => Err(match err {
            InsertStockTakeLineError::DatabaseError(err) => err.into(),
            InsertStockTakeLineError::InternalError(err) => {
                StandardGraphqlError::InternalError(err)
            }
            InsertStockTakeLineError::InvalidStore => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            InsertStockTakeLineError::StockTakeDoesNotExist => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            InsertStockTakeLineError::StockTakeLineAlreadyExists => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            InsertStockTakeLineError::StockLineDoesNotExist => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            InsertStockTakeLineError::StockLineAlreadyExistsInStockTake => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            InsertStockTakeLineError::LocationDoesNotExist => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            InsertStockTakeLineError::CannotEditFinalised => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            InsertStockTakeLineError::StockTakeLineXOrItem => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            InsertStockTakeLineError::ItemDoesNotExist => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
        }),
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
