use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_stocktake::mutations::{
    delete::{do_delete_stocktake, DeleteStocktakeInput, DeleteStocktakeResponse},
    insert::{do_insert_stocktake, InsertStocktakeInput, InsertStocktakeResponse},
    update::{do_update_stocktake, UpdateStocktakeInput, UpdateStocktakeResponse},
};
use graphql_stocktake_line::mutations::{
    delete::{do_delete_stocktake_line, DeleteStocktakeLineInput, DeleteStocktakeLineResponse},
    insert::{do_insert_stocktake_line, InsertStocktakeLineInput, InsertStocktakeLineResponse},
    update::{do_update_stocktake_line, UpdateStocktakeLineInput, UpdateStocktakeLineResponse},
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

#[cfg(test)]
mod graphql {

    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::{
        mock::{mock_stock_line_a, mock_stock_line_b, mock_store_a, MockDataInserts},
        StocktakeLineRowRepository,
    };
    use serde_json::json;

    use crate::BatchMutations;

    #[actix_rt::test]
    async fn test_graphql_stocktake_batch() {
        let (_, connection, _, settings) = setup_graphl_test(
            EmptyMutation,
            BatchMutations,
            "omsupply-database-gql-stocktake_batch",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation BatchStocktake($storeId: String, $input: BatchStocktakeInput!) {
          batchStocktake(storeId: $storeId, input: $input) {
            __typename
            ... on BatchStocktakeResponses {                    
              insertStocktakes {
                id
                response {
                  ... on StocktakeNode {
                    id
                  }
                }
              }
              insertStocktakeLines {
                id
                response {
                  ... on StocktakeLineNode {
                    id
                  }
                }
              }
              updateStocktakeLines {
                id
                response {
                  ... on StocktakeLineNode {
                    id
                  }
                }
              }
              updateStocktakes {
                id
                response {
                  ... on StocktakeNode {
                    id
                  }
                }
              }
            }
            ... on BatchStocktakeResponsesWithErrors {               
              updateStocktakeLines {
                id
                response {
                  ... on StocktakeLineNode {
                    id
                  }
                }
              }
              updateStocktakes {
                id
                response {
                  __typename
                  ... on StocktakeNode {
                    id
                  }
                  ... on UpdateStocktakeError {
                    __typename
                  }
                }        
              }
            }
          }
        }"#;

        // success
        let store = mock_store_a();
        let stock_line_a = mock_stock_line_a();
        let stock_line_b = mock_stock_line_b();

        let variables = Some(json!({
            "storeId": store.id,
            "input": {
              "insertStocktakes": [
                {
                  "id": "batch_stocktake_1",
                  "createdDatetime": "2022-02-09T15:16:00",
                },
              ],
              "insertStocktakeLines": [
                {
                  "id": "batch_stocktake_line_1",
                  "stocktakeId": "batch_stocktake_1",
                  "stockLineId": stock_line_a.id,
                },
                {
                  "id": "batch_stocktake_line_2",
                  "stocktakeId": "batch_stocktake_1",
                  "stockLineId": stock_line_b.id,
                }
              ],
            }
        }));
        let expected = json!({
          "batchStocktake": {
              "__typename": "BatchStocktakeResponses",
              "insertStocktakes": [
                {
                  "id": "batch_stocktake_1",
                }
              ],
              "insertStocktakeLines": [
                {
                  "id": "batch_stocktake_line_1",
                  "response": {
                    "id": "batch_stocktake_line_1",
                  }
                },
                {
                  "id": "batch_stocktake_line_2",
                  "response": {
                    "id": "batch_stocktake_line_2",
                  }
                }
              ],
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // structured error / abort transaction
        // update snapshotNumberOfPacks for a stocktake line and then try to finalise the stocktake
        let variables = Some(json!({
            "storeId": store.id,
            "input": {
              "updateStocktakeLines": [
                {
                  "id": "batch_stocktake_line_1",
                  "snapshotNumberOfPacks": stock_line_a.total_number_of_packs + 1,
                },
              ],
              "updateStocktakes": [
                {
                  "id": "batch_stocktake_1",
                  "status": "FINALISED"
                }
              ]
            }
        }));
        let expected = json!({
          "batchStocktake": {
              "__typename": "BatchStocktakeResponsesWithErrors",
              "updateStocktakeLines": [
                {
                  "id": "batch_stocktake_line_1",
                  "response": {
                    "id": "batch_stocktake_line_1",
                  }
                },
              ],
              "updateStocktakes": [
                {
                  "id": "batch_stocktake_1",
                  "response": {
                    "__typename": "UpdateStocktakeError",
                  },
                }
              ]
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
        // check that tx has been aborted and stocktake line hasn't been updated
        let stocktake_line = StocktakeLineRowRepository::new(&connection)
            .find_one_by_id("batch_stocktake_line_1")
            .unwrap()
            .unwrap();
        assert_eq!(
            stocktake_line.snapshot_number_of_packs,
            stock_line_a.total_number_of_packs
        );
    }
}
