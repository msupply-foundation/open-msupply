use async_graphql::*;
use chrono::NaiveDate;

use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::StocktakeLineNode;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake_line::update::{
        UpdateStocktakeLineError, UpdateStocktakeLineInput as UpdateStocktakeLine,
    },
};

#[derive(InputObject)]
pub struct UpdateStocktakeLineInput {
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
pub enum UpdateStocktakeLineResponse {
    Response(StocktakeLineNode),
}

pub fn update_stocktake_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateStocktakeLineInput,
) -> Result<UpdateStocktakeLineResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_update_stocktake_line(&service_ctx, service_provider, store_id, input)
}

pub fn do_update_stocktake_line(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: UpdateStocktakeLineInput,
) -> Result<UpdateStocktakeLineResponse> {
    let service = &service_provider.stocktake_line_service;
    let id = input.id.clone();
    match service.update_stocktake_line(&service_ctx, store_id, to_domain(input)) {
        Ok(line) => Ok(UpdateStocktakeLineResponse::Response(StocktakeLineNode {
            line,
        })),
        Err(err) => {
            let formatted_error = format!("Update stocktake line {}: {:#?}", id, err);
            let graphql_error = match err {
                UpdateStocktakeLineError::DatabaseError(err) => err.into(),
                UpdateStocktakeLineError::InternalError(err) => {
                    StandardGraphqlError::InternalError(err)
                }
                UpdateStocktakeLineError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateStocktakeLineError::StocktakeLineDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateStocktakeLineError::LocationDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateStocktakeLineError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

fn to_domain(
    UpdateStocktakeLineInput {
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
    }: UpdateStocktakeLineInput,
) -> UpdateStocktakeLine {
    UpdateStocktakeLine {
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
