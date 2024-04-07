use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_stocktake::mutations as stocktake;
use graphql_stocktake_line::mutations as stocktake_line;
use service::{
    auth::{Resource, ResourceAccessRequest},
    stocktake::*,
};

use crate::{to_standard_error, VecOrNone};

type ServiceResult = BatchStocktakeResult;
type ServiceInput = BatchStocktake;

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertStocktakeResponseWithId",
    params(stocktake::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateStocktakeResponseWithId",
    params(stocktake::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteStocktakeResponseWithId",
    params(stocktake::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertStocktakeLineResponseWithId",
    params(stocktake_line::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateStocktakeLineResponseWithId",
    params(stocktake_line::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteStocktakeLineResponseWithId",
    params(stocktake_line::delete::DeleteResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

type InsertStocktakesResponse = Option<Vec<MutationWithId<stocktake::insert::InsertResponse>>>;
type InsertStocktakeLinesResponse =
    Option<Vec<MutationWithId<stocktake_line::insert::InsertResponse>>>;
type UpdateStocktakeLinesResponse =
    Option<Vec<MutationWithId<stocktake_line::update::UpdateResponse>>>;
type DeleteStocktakeLinesResponse =
    Option<Vec<MutationWithId<stocktake_line::delete::DeleteResponse>>>;
type UpdateStocktakesResponse = Option<Vec<MutationWithId<stocktake::update::UpdateResponse>>>;
type DeleteStocktakesResponse = Option<Vec<MutationWithId<stocktake::delete::DeleteResponse>>>;

#[derive(SimpleObject)]
#[graphql(name = "BatchStocktakeResponse")]
pub struct BatchResponse {
    insert_stocktakes: InsertStocktakesResponse,
    insert_stocktake_lines: InsertStocktakeLinesResponse,
    update_stocktake_lines: UpdateStocktakeLinesResponse,
    delete_stocktake_lines: DeleteStocktakeLinesResponse,
    update_stocktakes: UpdateStocktakesResponse,
    delete_stocktakes: DeleteStocktakesResponse,
}

#[derive(InputObject)]
#[graphql(name = "BatchStocktakeInput")]
pub struct BatchInput {
    pub insert_stocktakes: Option<Vec<stocktake::insert::InsertInput>>,
    pub insert_stocktake_lines: Option<Vec<stocktake_line::insert::InsertInput>>,
    pub update_stocktake_lines: Option<Vec<stocktake_line::update::UpdateInput>>,
    pub delete_stocktake_lines: Option<Vec<stocktake_line::delete::DeleteInput>>,
    pub update_stocktakes: Option<Vec<stocktake::update::UpdateInput>>,
    pub delete_stocktakes: Option<Vec<stocktake::delete::DeleteInput>>,
    pub continue_on_error: Option<bool>,
}

pub fn batch(ctx: &Context<'_>, store_id: &str, input: BatchInput) -> Result<BatchResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = service_provider
        .stocktake_service
        .batch_stocktake(&service_context, input.to_domain())?;

    BatchResponse::from_domain(response)
}

impl BatchInput {
    fn to_domain(self) -> ServiceInput {
        let BatchInput {
            insert_stocktakes,
            insert_stocktake_lines,
            update_stocktake_lines,
            delete_stocktake_lines,
            update_stocktakes,
            delete_stocktakes,
            continue_on_error,
        } = self;

        ServiceInput {
            insert_stocktake: insert_stocktakes
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_line: insert_stocktake_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_line: update_stocktake_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_line: delete_stocktake_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_stocktake: update_stocktakes
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_stocktake: delete_stocktakes
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            continue_on_error,
        }
    }
}

impl BatchResponse {
    fn from_domain(
        ServiceResult {
            insert_stocktake,
            insert_line,
            update_line,
            delete_line,
            update_stocktake,
            delete_stocktake,
        }: ServiceResult,
    ) -> Result<BatchResponse> {
        let result = BatchResponse {
            insert_stocktakes: map_insert_stocktakes(insert_stocktake)?,
            insert_stocktake_lines: map_insert_lines(insert_line)?,
            update_stocktake_lines: map_update_lines(update_line)?,
            delete_stocktake_lines: map_delete_lines(delete_line)?,
            update_stocktakes: map_update_stocktakes(update_stocktake)?,
            delete_stocktakes: map_delete_stocktakes(delete_stocktake)?,
        };

        Ok(result)
    }
}

fn map_insert_stocktakes(responses: InsertStocktakesResult) -> Result<InsertStocktakesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match stocktake::insert::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };

        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_update_stocktakes(responses: UpdateStocktakesResult) -> Result<UpdateStocktakesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match stocktake::update::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };

        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_delete_stocktakes(responses: DeleteStocktakesResult) -> Result<DeleteStocktakesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match stocktake::delete::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };

        result.push(MutationWithId {
            id: response.input,
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_insert_lines(responses: InsertStocktakeLinesResult) -> Result<InsertStocktakeLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match stocktake_line::insert::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };

        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_update_lines(responses: UpdateStocktakeLinesResult) -> Result<UpdateStocktakeLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match stocktake_line::update::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };

        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_delete_lines(responses: DeleteStocktakeLinesResult) -> Result<DeleteStocktakeLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match stocktake_line::delete::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };

        result.push(MutationWithId {
            id: response.input,
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::MockDataInserts, RepositoryError, StocktakeLine, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::{
            BatchStocktake, BatchStocktakeResult, DeleteStocktakeError, StocktakeServiceTrait,
            UpdateStocktake, UpdateStocktakeError,
        },
        stocktake_line::{
            DeleteStocktakeLineError, InsertStocktakeLine, InsertStocktakeLineError,
            UpdateStocktakeLine, UpdateStocktakeLineError,
        },
        InputWithResult,
    };
    use util::inline_init;

    use crate::BatchMutations;

    type ServiceInput = BatchStocktake;
    type ServiceResult = BatchStocktakeResult;

    type Method = dyn Fn(ServiceInput) -> Result<ServiceResult, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl StocktakeServiceTrait for TestService {
        fn batch_stocktake(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<ServiceResult, RepositoryError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.stocktake_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_batch_stocktake() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            BatchMutations,
            "test_graphql_batch_stocktake",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation mut($input: BatchStocktakeInput!, $storeId: String!) {
            batchStocktake(input: $input, storeId: $storeId) {
              insertStocktakes {
                id
                response {
                  __typename
                }
              }
              insertStocktakeLines {
                id
                response {
                  ... on InsertStocktakeLineError {
                    error {
                      __typename
                    }
                  }
                }
              }
              updateStocktakeLines {
                id
                response {
                  ... on UpdateStocktakeLineError {
                    error {
                      __typename
                    }
                  }
                  ... on StocktakeLineNode {
                      id
                  }
                }
              }
              deleteStocktakeLines {
                response {
                  ... on DeleteStocktakeLineError {
                    error {
                      __typename
                    }
                  }
                }
                id
              }
              updateStocktakes {
                id
                response {
                  ... on UpdateStocktakeError {
                    error {
                      __typename
                    }
                  }
                }
              }
              deleteStocktakes {
                id
                response {
                  ... on DeleteStocktakeError {
                    error {
                      __typename
                    }
                  }
                }
              }
            }
          }
          
        "#;

        let expected = json!({
          "batchStocktake": {
            "deleteStocktakeLines": [
              {
                "id": "id4",
                "response": {
                  "error": {
                    "__typename": "CannotEditStocktake"
                  }
                }
              }
            ],
            "deleteStocktakes": [
              {
                "id": "id6",
                "response": {
                  "error": {
                    "__typename": "CannotEditStocktake"
                  }
                }
              }
            ],
            "insertStocktakeLines": [
              {
                "id": "id2",
                "response": {
                  "error": {
                    "__typename": "CannotEditStocktake"
                  }
                }
              }
            ],
            "insertStocktakes": null,
            "updateStocktakeLines": [
              {
                "id": "id3",
                "response": {
                  "error": {
                    "__typename": "CannotEditStocktake"
                  }
                }
              }
            ],
            "updateStocktakes": [
              {
                "id": "id5",
                "response": {
                  "error": {
                    "__typename": "CannotEditStocktake"
                  }
                }
              }
            ]
          }
        });

        let variables = Some(json!({
            "storeId": "n/a",
            "input": {}
        }
        ));

        // Structured Errors
        let test_service = TestService(Box::new(|_| {
            Ok(ServiceResult {
                insert_stocktake: vec![],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertStocktakeLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertStocktakeLineError::CannotEditFinalised {}),
                }],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateStocktakeLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Err(UpdateStocktakeLineError::CannotEditFinalised {}),
                }],
                delete_line: vec![InputWithResult {
                    input: "id4".to_string(),
                    result: Err(DeleteStocktakeLineError::CannotEditFinalised {}),
                }],
                update_stocktake: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateStocktake| input.id = "id5".to_string()),
                    result: Err(UpdateStocktakeError::CannotEditFinalised {}),
                }],
                delete_stocktake: vec![InputWithResult {
                    input: "id6".to_string(),
                    result: Err(DeleteStocktakeError::CannotEditFinalised {}),
                }],
            })
        }));

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Standard Error
        let test_service = TestService(Box::new(|_| {
            Ok(ServiceResult {
                insert_stocktake: vec![],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertStocktakeLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertStocktakeLineError::CannotEditFinalised {}),
                }],
                update_line: vec![],
                delete_line: vec![],
                update_stocktake: vec![],
                delete_stocktake: vec![InputWithResult {
                    input: "id6".to_string(),
                    result: Err(DeleteStocktakeError::StocktakeDoesNotExist {}),
                }],
            })
        }));
        let expected_message = "Bad user input";
        let expected_extensions = json!({ "input": format!("{:#?}", "id6") });
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &variables,
            &expected_message,
            Some(expected_extensions),
            Some(service_provider(test_service, &connection_manager))
        );

        // Success

        let expected = json!({
            "batchStocktake": {
              "deleteStocktakeLines": null,
              "deleteStocktakes": null,
              "insertStocktakeLines": null,
              "insertStocktakes": null,
              "updateStocktakeLines": [
                {
                  "id": "id3",
                  "response": {
                    "id": "id3"
                  }
                }
              ],
              "updateStocktakes": null
            }
          }
        );

        let test_service = TestService(Box::new(|_| {
            Ok(ServiceResult {
                insert_stocktake: vec![],
                insert_line: vec![],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateStocktakeLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Ok(inline_init(|input: &mut StocktakeLine| {
                        input.line.id = "id3".to_string()
                    })),
                }],
                delete_line: vec![],
                update_stocktake: vec![],
                delete_stocktake: vec![],
            })
        }));

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
