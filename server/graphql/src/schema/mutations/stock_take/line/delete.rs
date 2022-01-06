use async_graphql::*;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    stock_take_line::delete::DeleteStockTakeLineError,
};

use crate::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

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
) -> Result<DeleteStockTakeLineResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::DeleteStockTakeLine,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    let service = &service_provider.stock_take_line_service;
    match service.delete_stock_take_line(&service_ctx, store_id, &input.id) {
        Ok(id) => Ok(DeleteStockTakeLineResponse::Response(
            DeleteStockTakeLineNode { id },
        )),
        Err(err) => {
            let formatted_error = format!("{:#?}", err);
            let graphql_error = match err {
                DeleteStockTakeLineError::DatabaseError(err) => err.into(),
                DeleteStockTakeLineError::InternalError(err) => {
                    StandardGraphqlError::InternalError(err)
                }
                DeleteStockTakeLineError::StockTakeLineDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DeleteStockTakeLineError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DeleteStockTakeLineError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}
