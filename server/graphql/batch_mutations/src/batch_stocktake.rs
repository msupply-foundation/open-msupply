use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_stocktake::mutations::{
    delete::{DeleteStocktakeInput, DeleteStocktakeResponse, do_delete_stocktake},
    insert::{do_insert_stocktake, InsertStocktakeInput, InsertStocktakeResponse},
    update::{UpdateStocktakeInput, UpdateStocktakeResponse, do_update_stocktake},
};
use graphql_stocktake_line::mutations::{
    delete::{DeleteStocktakeLineInput, DeleteStocktakeLineResponse, do_delete_stocktake_line},
    insert::{InsertStocktakeLineInput, InsertStocktakeLineResponse, do_insert_stocktake_line},
    update::{UpdateStocktakeLineInput, UpdateStocktakeLineResponse, do_update_stocktake_line},
};
use repository::{RepositoryError, TransactionError};
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
};

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertStocktakeResponseWithId",
    params(InsertStocktakeResponse)
))]
#[graphql(concrete(
    name = "UpdateStocktakeResponseWithId",
    params(UpdateStocktakeResponse)
))]
#[graphql(concrete(
    name = "DeleteStocktakeResponseWithId",
    params(DeleteStocktakeResponse)
))]
#[graphql(concrete(
    name = "InsertStocktakeLineResponseWithId",
    params(InsertStocktakeLineResponse)
))]
#[graphql(concrete(
    name = "UpdateStocktakeLineResponseWithId",
    params(UpdateStocktakeLineResponse)
))]
#[graphql(concrete(
    name = "DeleteStocktakeLineResponseWithId",
    params(DeleteStocktakeLineResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

#[derive(InputObject)]
pub struct BatchStocktakeInput {
    pub insert_stocktakes: Option<Vec<InsertStocktakeInput>>,
    pub insert_stocktake_lines: Option<Vec<InsertStocktakeLineInput>>,
    pub update_stocktake_lines: Option<Vec<UpdateStocktakeLineInput>>,
    pub delete_stocktake_lines: Option<Vec<DeleteStocktakeLineInput>>,
    pub update_stocktakes: Option<Vec<UpdateStocktakeInput>>,
    pub delete_stocktakes: Option<Vec<DeleteStocktakeInput>>,
}

#[derive(SimpleObject)]
pub struct BatchStocktakeResponses {
    insert_stocktakes: Option<Vec<MutationWithId<InsertStocktakeResponse>>>,
    insert_stocktake_lines: Option<Vec<MutationWithId<InsertStocktakeLineResponse>>>,
    update_stocktake_lines: Option<Vec<MutationWithId<UpdateStocktakeLineResponse>>>,
    delete_stocktake_lines: Option<Vec<MutationWithId<DeleteStocktakeLineResponse>>>,
    update_stocktakes: Option<Vec<MutationWithId<UpdateStocktakeResponse>>>,
    delete_stocktakes: Option<Vec<MutationWithId<DeleteStocktakeResponse>>>,
}

// Same as BatchStocktakeResponses but GQL needs an extra type for it
#[derive(SimpleObject)]
pub struct BatchStocktakeResponsesWithErrors {
    insert_stocktakes: Option<Vec<MutationWithId<InsertStocktakeResponse>>>,
    insert_stocktake_lines: Option<Vec<MutationWithId<InsertStocktakeLineResponse>>>,
    update_stocktake_lines: Option<Vec<MutationWithId<UpdateStocktakeLineResponse>>>,
    delete_stocktake_lines: Option<Vec<MutationWithId<DeleteStocktakeLineResponse>>>,
    update_stocktakes: Option<Vec<MutationWithId<UpdateStocktakeResponse>>>,
    delete_stocktakes: Option<Vec<MutationWithId<DeleteStocktakeResponse>>>,
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
            resource: Resource::MutateStocktake,
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
                        insert_stocktakes: response.insert_stocktakes,
                        insert_stocktake_lines: response.insert_stocktake_lines,
                        update_stocktake_lines: response.update_stocktake_lines,
                        delete_stocktake_lines: response.delete_stocktake_lines,
                        update_stocktakes: response.update_stocktakes,
                        delete_stocktakes: response.delete_stocktakes,
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
    let insert_stocktakes = match input.insert_stocktakes {
        Some(input) => {
            let mut list = Vec::<MutationWithId<InsertStocktakeResponse>>::new();
            for input in input {
                list.push(MutationWithId {
                    id: input.id.clone(),
                    response: do_insert_stocktake(service_ctx, service_provider, store_id, input)?,
                });
            }
            Some(list)
        }
        None => None,
    };

    let insert_stocktake_lines = match input.insert_stocktake_lines {
        Some(input) => {
            let mut list = Vec::<MutationWithId<InsertStocktakeLineResponse>>::new();
            for input in input {
                list.push(MutationWithId {
                    id: input.id.clone(),
                    response: do_insert_stocktake_line(
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
            let mut list = Vec::<MutationWithId<UpdateStocktakeLineResponse>>::new();
            for input in input {
                list.push(MutationWithId {
                    id: input.id.clone(),
                    response: do_update_stocktake_line(
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
            let mut list = Vec::<MutationWithId<DeleteStocktakeLineResponse>>::new();
            for input in input {
                list.push(MutationWithId {
                    id: input.id.clone(),
                    response: do_delete_stocktake_line(
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

    let update_stocktakes = match input.update_stocktakes {
        Some(input) => {
            let mut list = Vec::<MutationWithId<UpdateStocktakeResponse>>::new();
            for input in input {
                list.push(MutationWithId {
                    id: input.id.clone(),
                    response: do_update_stocktake(service_ctx, service_provider, store_id, input)?,
                });
            }
            Some(list)
        }
        None => None,
    };

    let delete_stocktakes = match input.delete_stocktakes {
        Some(input) => {
            let mut list = Vec::<MutationWithId<DeleteStocktakeResponse>>::new();
            for input in input {
                list.push(MutationWithId {
                    id: input.id.clone(),
                    response: do_delete_stocktake(service_ctx, service_provider, store_id, input)?,
                });
            }
            Some(list)
        }
        None => None,
    };

    let response = BatchStocktakeResponses {
        insert_stocktakes,
        insert_stocktake_lines,
        update_stocktake_lines,
        delete_stocktake_lines,
        update_stocktakes,
        delete_stocktakes,
    };
    Ok(response)
}

fn has_no_errors(response: &BatchStocktakeResponses) -> bool {
    if let Some(responses) = &response.insert_stocktakes {
        if !responses.iter().all(|mutation_with_id| {
            matches!(
                mutation_with_id.response,
                InsertStocktakeResponse::Response(_)
            )
        }) {
            return false;
        }
    }
    if let Some(responses) = &response.update_stocktakes {
        if !responses.iter().all(|mutation_with_id| {
            matches!(
                mutation_with_id.response,
                UpdateStocktakeResponse::Response(_)
            )
        }) {
            return false;
        }
    }
    if let Some(responses) = &response.delete_stocktakes {
        if !responses.iter().all(|mutation_with_id| {
            matches!(
                mutation_with_id.response,
                DeleteStocktakeResponse::Response(_)
            )
        }) {
            return false;
        }
    }

    if let Some(responses) = &response.insert_stocktake_lines {
        if !responses.iter().all(|mutation_with_id| {
            matches!(
                mutation_with_id.response,
                InsertStocktakeLineResponse::Response(_)
            )
        }) {
            return false;
        }
    }
    if let Some(responses) = &response.update_stocktake_lines {
        if !responses.iter().all(|mutation_with_id| {
            matches!(
                mutation_with_id.response,
                UpdateStocktakeLineResponse::Response(_)
            )
        }) {
            return false;
        }
    }
    if let Some(responses) = &response.delete_stocktake_lines {
        if !responses.iter().all(|mutation_with_id| {
            matches!(
                mutation_with_id.response,
                DeleteStocktakeLineResponse::Response(_)
            )
        }) {
            return false;
        }
    }

    true
}
