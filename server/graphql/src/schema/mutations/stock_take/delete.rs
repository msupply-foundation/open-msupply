use crate::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

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
) -> Result<DeleteStockTakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::DeleteStockTake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    let service = &service_provider.stock_take_service;
    match service.delete_stock_take(&service_ctx, store_id, &input.id) {
        Ok(stock_take_id) => Ok(DeleteStockTakeResponse::Response(DeleteStockTakeNode {
            stock_take_id,
        })),
        Err(err) => {
            let formatted_error = format!("{:#?}", err);
            let graphql_error = match err {
                ServiceError::DatabaseError(err) => err.into(),
                ServiceError::InvalidStore => StandardGraphqlError::BadUserInput(formatted_error),
                ServiceError::StockTakeDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                ServiceError::StockTakeLinesExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                ServiceError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}
