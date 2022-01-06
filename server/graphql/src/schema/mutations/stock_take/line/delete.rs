use async_graphql::*;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    stock_take_line::delete::DeleteStockTakeLineError,
};

use crate::{standard_graphql_error::StandardGraphqlError, ContextExt};

#[derive(InputObject)]
pub struct DeleteStockTakeLineInput {
    pub id: String,
}

#[derive(SimpleObject)]
pub struct DeleteStockTakeLineNode {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteStockTakeLineResponse {
    Response(DeleteStockTakeLineNode),
}

pub fn delete_stock_take_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: &DeleteStockTakeLineInput,
) -> Result<DeleteStockTakeLineResponse, StandardGraphqlError> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    service_provider.validation_service.validate(
        &service_ctx,
        ctx.get_auth_data(),
        &ctx.get_auth_token(),
        &ResourceAccessRequest {
            resource: Resource::DeleteStockTakeLine,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service = &service_provider.stock_take_line_service;
    match service.delete_stock_take_line(&service_ctx, store_id, &input.id) {
        Ok(id) => Ok(DeleteStockTakeLineResponse::Response(
            DeleteStockTakeLineNode { id },
        )),
        Err(err) => Err(match err {
            DeleteStockTakeLineError::DatabaseError(err) => err.into(),
            DeleteStockTakeLineError::InternalError(err) => {
                StandardGraphqlError::InternalError(err)
            }
            DeleteStockTakeLineError::StockTakeLineDoesNotExist => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            DeleteStockTakeLineError::InvalidStore => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
            DeleteStockTakeLineError::CannotEditFinalised => {
                StandardGraphqlError::BadUserInput(format!("{:?}", err))
            }
        }),
    }
}
