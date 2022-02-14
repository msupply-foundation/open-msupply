use crate::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use async_graphql::*;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake::delete::DeleteStocktakeError as ServiceError,
};

#[derive(InputObject)]
pub struct DeleteStocktakeInput {
    pub id: String,
}

#[derive(SimpleObject)]
pub struct DeleteStocktakeNode {
    /// The id of the deleted stocktake
    pub id: String,
}

#[derive(Union)]
pub enum DeleteStocktakeResponse {
    Response(DeleteStocktakeNode),
}

pub fn delete_stocktake(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteStocktakeInput,
) -> Result<DeleteStocktakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_delete_stocktake(&service_ctx, service_provider, store_id, input)
}

pub fn do_delete_stocktake(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: DeleteStocktakeInput,
) -> Result<DeleteStocktakeResponse> {
    let service = &service_provider.stocktake_service;
    match service.delete_stocktake(&service_ctx, store_id, &input.id) {
        Ok(stocktake_id) => Ok(DeleteStocktakeResponse::Response(DeleteStocktakeNode {
            id: stocktake_id,
        })),
        Err(err) => {
            let formatted_error = format!("Delete stocktake {}: {:#?}", input.id, err);
            let graphql_error = match err {
                ServiceError::DatabaseError(err) => err.into(),
                ServiceError::InvalidStore => StandardGraphqlError::BadUserInput(formatted_error),
                ServiceError::StocktakeDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                ServiceError::StocktakeLinesExist => {
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
