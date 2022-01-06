use crate::{standard_graphql_error::StandardGraphqlError, ContextExt};

use async_graphql::*;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    stock_take::delete::DeleteStockTakeError as ServiceError,
};

#[derive(InputObject)]
pub struct DeleteStockTakeInput {
    pub id: String,
}

#[derive(SimpleObject)]
pub struct DeleteStockTakeNode {
    pub stock_take_id: String,
}

#[derive(Union)]
pub enum DeleteStockTakeResponse {
    Response(DeleteStockTakeNode),
}

pub fn delete_stock_take(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteStockTakeInput,
) -> Result<DeleteStockTakeResponse, StandardGraphqlError> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    service_provider.validation_service.validate(
        &service_ctx,
        ctx.get_auth_data(),
        &ctx.get_auth_token(),
        &ResourceAccessRequest {
            resource: Resource::DeleteStockTake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service = &service_provider.stock_take_service;
    match service.delete_stock_take(&service_ctx, store_id, &input.id) {
        Ok(stock_take_id) => Ok(DeleteStockTakeResponse::Response(DeleteStockTakeNode {
            stock_take_id,
        })),
        Err(err) => match err {
            ServiceError::DatabaseError(err) => Err(err.into()),
            ServiceError::InvalidStore => {
                Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
            }
            ServiceError::StockTakeDoesNotExist => {
                Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
            }
            ServiceError::StockTakeLinesExist => {
                Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
            }
            ServiceError::CannotEditFinalised => {
                Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
            }
        },
    }
}
