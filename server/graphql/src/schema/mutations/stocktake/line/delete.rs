use async_graphql::*;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake_line::delete::DeleteStocktakeLineError,
};

use crate::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

#[derive(InputObject)]
pub struct DeleteStocktakeLineInput {
    pub id: String,
}

#[derive(SimpleObject)]
pub struct DeleteStocktakeLineNode {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteStocktakeLineResponse {
    Response(DeleteStocktakeLineNode),
}

pub fn delete_stocktake_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteStocktakeLineInput,
) -> Result<DeleteStocktakeLineResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_delete_stocktake_line(&service_ctx, service_provider, store_id, input)
}

pub fn do_delete_stocktake_line(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: DeleteStocktakeLineInput,
) -> Result<DeleteStocktakeLineResponse> {
    let service = &service_provider.stocktake_line_service;
    match service.delete_stocktake_line(&service_ctx, store_id, &input.id) {
        Ok(id) => Ok(DeleteStocktakeLineResponse::Response(
            DeleteStocktakeLineNode { id },
        )),
        Err(err) => {
            let formatted_error = format!("Delete stocktake line {}: {:#?}", input.id, err);
            let graphql_error = match err {
                DeleteStocktakeLineError::DatabaseError(err) => err.into(),
                DeleteStocktakeLineError::InternalError(err) => {
                    StandardGraphqlError::InternalError(err)
                }
                DeleteStocktakeLineError::StocktakeLineDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DeleteStocktakeLineError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DeleteStocktakeLineError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}
