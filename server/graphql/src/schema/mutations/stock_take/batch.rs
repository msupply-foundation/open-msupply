use crate::{
    schema::mutations::stock_take::{
        delete::DeleteStockTakeResponse, update::UpdateStockTakeResponse,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use async_graphql::*;
use repository::{RepositoryError, TransactionError};
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    delete::{do_delete_stock_take, DeleteStockTakeInput},
    insert::{do_insert_stock_take, InsertStockTakeInput, InsertStockTakeResponse},
    line::{
        delete::{
            do_delete_stock_take_line, DeleteStockTakeLineInput, DeleteStockTakeLineResponse,
        },
        insert::{
            do_insert_stock_take_line, InsertStockTakeLineInput, InsertStockTakeLineResponse,
        },
        update::{
            do_update_stock_take_line, UpdateStockTakeLineInput, UpdateStockTakeLineResponse,
        },
    },
    update::{do_update_stock_take, UpdateStockTakeInput},
};

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertStocktakeLineResponseWithId",
    params(InsertStockTakeLineResponse)
))]
#[graphql(concrete(
    name = "UpdateStocktakeLineResponseWithId",
    params(UpdateStockTakeLineResponse)
))]
#[graphql(concrete(
    name = "DeleteStocktakeLineResponseWithId",
    params(DeleteStockTakeLineResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

#[derive(InputObject)]
pub struct BatchStocktakeInput {
    pub insert_stocktake: Option<InsertStockTakeInput>,
    pub insert_stocktake_lines: Option<Vec<InsertStockTakeLineInput>>,
    pub update_stocktake_lines: Option<Vec<UpdateStockTakeLineInput>>,
    pub delete_stocktake_lines: Option<Vec<DeleteStockTakeLineInput>>,
    pub update_stocktake: Option<UpdateStockTakeInput>,
    pub delete_stocktake: Option<DeleteStockTakeInput>,
}

#[derive(SimpleObject)]
pub struct BatchStocktakeResponses {
    insert_stocktake: Option<InsertStockTakeResponse>,
    insert_stocktake_lines: Option<Vec<MutationWithId<InsertStockTakeLineResponse>>>,
    update_stocktake_lines: Option<Vec<MutationWithId<UpdateStockTakeLineResponse>>>,
    delete_stocktake_lines: Option<Vec<MutationWithId<DeleteStockTakeLineResponse>>>,
    update_stocktake: Option<UpdateStockTakeResponse>,
    delete_stocktake: Option<DeleteStockTakeResponse>,
}

// Same as BatchStocktakeResponses but GQL needs an extra type for it
#[derive(SimpleObject)]
pub struct BatchStocktakeResponsesWithErrors {
    insert_stocktake: Option<InsertStockTakeResponse>,
    insert_stocktake_lines: Option<Vec<MutationWithId<InsertStockTakeLineResponse>>>,
    update_stocktake_lines: Option<Vec<MutationWithId<UpdateStockTakeLineResponse>>>,
    delete_stocktake_lines: Option<Vec<MutationWithId<DeleteStockTakeLineResponse>>>,
    update_stocktake: Option<UpdateStockTakeResponse>,
    delete_stocktake: Option<DeleteStockTakeResponse>,
}

#[derive(Union)]
pub enum BatchStocktakeResponse {
    Response(BatchStocktakeResponses),
    /// At least one operation failed. No changes have been applied.
    Error(BatchStocktakeResponsesWithErrors),
}

pub fn batch_stocktake(
    ctx: &Context<'_>,
    store_id: &str,
    input: BatchStocktakeInput,
) -> Result<BatchStocktakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::BatchStockTake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    let result = service_ctx.connection.transaction_sync(|_| {
        let response = apply_batch(&service_ctx, service_provider, store_id, input)
            .map_err(|err| BatchError::Standard(err))?;

        if has_no_errors(&response) {
            return Ok(response);
        }
        // else abort the transaction but return the response in a structured error
        return Err(BatchError::Structured(response));
    });
    let response = match result {
        Ok(response) => BatchStocktakeResponse::Response(response),
        Err(error) => match error {
            TransactionError::Transaction { msg, level } => {
                return Err(
                    StandardGraphqlError::from(RepositoryError::TransactionError { msg, level })
                        .extend(),
                );
            }
            TransactionError::Inner(err) => match err {
                BatchError::Standard(err) => return Err(err),
                BatchError::Structured(response) => {
                    BatchStocktakeResponse::Error(BatchStocktakeResponsesWithErrors {
                        insert_stocktake: response.insert_stocktake,
                        insert_stocktake_lines: response.insert_stocktake_lines,
                        update_stocktake_lines: response.update_stocktake_lines,
                        delete_stocktake_lines: response.delete_stocktake_lines,
                        update_stocktake: response.update_stocktake,
                        delete_stocktake: response.delete_stocktake,
                    })
                }
            },
        },
    };

    Ok(response)
}

enum BatchError {
    Standard(Error),
    // Response with errors:
    Structured(BatchStocktakeResponses),
}

fn apply_batch(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: BatchStocktakeInput,
) -> Result<BatchStocktakeResponses> {
    let insert_stocktake = match input.insert_stocktake {
        Some(input) => Some(do_insert_stock_take(
            service_ctx,
            service_provider,
            store_id,
            input,
        )?),
        None => None,
    };
    let insert_stocktake_lines = match input.insert_stocktake_lines {
        Some(input) => {
            let mut list = Vec::<MutationWithId<InsertStockTakeLineResponse>>::new();
            for input in input {
                list.push(MutationWithId {
                    id: input.id.clone(),
                    response: do_insert_stock_take_line(
                        service_ctx,
                        service_provider,
                        store_id,
                        input,
                    )?,
                });
            }
            Some(list)
        }
        None => None,
    };
    let update_stocktake_lines = match input.update_stocktake_lines {
        Some(input) => {
            let mut list = Vec::<MutationWithId<UpdateStockTakeLineResponse>>::new();
            for input in input {
                list.push(MutationWithId {
                    id: input.id.clone(),
                    response: do_update_stock_take_line(
                        service_ctx,
                        service_provider,
                        store_id,
                        input,
                    )?,
                });
            }
            Some(list)
        }
        None => None,
    };
    let delete_stocktake_lines = match input.delete_stocktake_lines {
        Some(input) => {
            let mut list = Vec::<MutationWithId<DeleteStockTakeLineResponse>>::new();
            for input in input {
                list.push(MutationWithId {
                    id: input.id.clone(),
                    response: do_delete_stock_take_line(
                        service_ctx,
                        service_provider,
                        store_id,
                        input,
                    )?,
                });
            }
            Some(list)
        }
        None => None,
    };
    let update_stocktake = match input.update_stocktake {
        Some(input) => Some(do_update_stock_take(
            service_ctx,
            service_provider,
            store_id,
            input,
        )?),
        None => None,
    };
    let delete_stocktake = match input.delete_stocktake {
        Some(input) => Some(do_delete_stock_take(
            service_ctx,
            service_provider,
            store_id,
            input,
        )?),
        None => None,
    };

    let response = BatchStocktakeResponses {
        insert_stocktake,
        insert_stocktake_lines,
        update_stocktake_lines,
        delete_stocktake_lines,
        update_stocktake,
        delete_stocktake,
    };
    Ok(response)
}

fn has_no_errors(response: &BatchStocktakeResponses) -> bool {
    if let Some(response) = &response.insert_stocktake {
        if !matches!(response, InsertStockTakeResponse::Response(_)) {
            return false;
        }
    }
    if let Some(response) = &response.update_stocktake {
        if !matches!(response, UpdateStockTakeResponse::Response(_)) {
            return false;
        }
    }
    if let Some(response) = &response.delete_stocktake {
        if !matches!(response, DeleteStockTakeResponse::Response(_)) {
            return false;
        }
    }

    if let Some(responses) = &response.insert_stocktake_lines {
        if !responses.iter().all(|mutation_with_id| {
            matches!(
                mutation_with_id.response,
                InsertStockTakeLineResponse::Response(_)
            )
        }) {
            return false;
        }
    }
    if let Some(responses) = &response.update_stocktake_lines {
        if !responses.iter().all(|mutation_with_id| {
            matches!(
                mutation_with_id.response,
                UpdateStockTakeLineResponse::Response(_)
            )
        }) {
            return false;
        }
    }
    if let Some(responses) = &response.delete_stocktake_lines {
        if !responses.iter().all(|mutation_with_id| {
            matches!(
                mutation_with_id.response,
                DeleteStockTakeLineResponse::Response(_)
            )
        }) {
            return false;
        }
    }

    true
}
