use crate::{
    schema::types::StockTakeLineNode,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use async_graphql::*;
use chrono::NaiveDate;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stock_take_line::update::{
        UpdateStockTakeLineError, UpdateStockTakeLineInput as UpdateStockTakeLine,
    },
};

#[derive(InputObject)]
pub struct UpdateStockTakeLineInput {
    pub id: String,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub snapshot_number_of_packs: Option<u32>,
    pub counted_number_of_packs: Option<u32>,

    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<u32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
}

#[derive(Union)]
pub enum UpdateStockTakeLineResponse {
    Response(StockTakeLineNode),
}

pub fn update_stock_take_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateStockTakeLineInput,
) -> Result<UpdateStockTakeLineResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::UpdateStockTakeLine,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_update_stock_take_line(&service_ctx, service_provider, store_id, input)
}

pub fn do_update_stock_take_line(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: UpdateStockTakeLineInput,
) -> Result<UpdateStockTakeLineResponse> {
    let service = &service_provider.stock_take_line_service;
    match service.update_stock_take_line(&service_ctx, store_id, to_domain(input)) {
        Ok(line) => Ok(UpdateStockTakeLineResponse::Response(StockTakeLineNode {
            line,
        })),
        Err(err) => {
            let formatted_error = format!("{:#?}", err);
            let graphql_error = match err {
                UpdateStockTakeLineError::DatabaseError(err) => err.into(),
                UpdateStockTakeLineError::InternalError(err) => {
                    StandardGraphqlError::InternalError(err)
                }
                UpdateStockTakeLineError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateStockTakeLineError::StockTakeLineDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateStockTakeLineError::LocationDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateStockTakeLineError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

fn to_domain(
    UpdateStockTakeLineInput {
        id,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }: UpdateStockTakeLineInput,
) -> UpdateStockTakeLine {
    UpdateStockTakeLine {
        id,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }
}
