use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_requisition_line::mutations::response_requisition_line;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::response_requisition::*,
};

use crate::{to_standard_error, VecOrNone};

type ServiceResult = BatchResponseRequisitionResult;
type ServiceInput = BatchResponseRequisition;

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "DeleteResponseRequisitionLineResponseWithId",
    params(response_requisition_line::delete::DeleteResponse)
))]

pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

type DeleteRequisitionLinesResponse =
    Option<Vec<MutationWithId<response_requisition_line::delete::DeleteResponse>>>;

#[derive(SimpleObject)]
#[graphql(name = "BatchResponseRequisitionResponse")]
pub struct BatchResponse {
    delete_response_requisition_lines: DeleteRequisitionLinesResponse,
}

#[derive(InputObject)]
#[graphql(name = "BatchResponseRequisitionInput")]
pub struct BatchInput {
    pub delete_response_requisition_lines:
        Option<Vec<response_requisition_line::delete::DeleteInput>>,
    pub continue_on_error: Option<bool>,
}

pub fn batch(ctx: &Context<'_>, store_id: &str, input: BatchInput) -> Result<BatchResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = service_provider
        .requisition_service
        .batch_response_requisition(&service_context, input.to_domain())?;

    BatchResponse::from_domain(response)
}

impl BatchInput {
    fn to_domain(self) -> ServiceInput {
        let BatchInput {
            delete_response_requisition_lines,
            continue_on_error,
        } = self;

        ServiceInput {
            delete_line: delete_response_requisition_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            continue_on_error,
        }
    }
}

impl BatchResponse {
    fn from_domain(ServiceResult { delete_line }: ServiceResult) -> Result<BatchResponse> {
        let result = BatchResponse {
            delete_response_requisition_lines: map_delete_lines(delete_line)?,
        };

        Ok(result)
    }
}

fn map_delete_lines(
    responses: DeleteRequisitionLinesResult,
) -> Result<DeleteRequisitionLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match response_requisition_line::delete::map_response(response.result)
        {
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

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{mock::MockDataInserts, RepositoryError, StorageConnectionManager};
    use serde_json::json;
    use service::{
        requisition::{
            response_requisition::{BatchResponseRequisition, BatchResponseRequisitionResult},
            RequisitionServiceTrait,
        },
        requisition_line::response_requisition_line::{
            DeleteResponseRequisitionLine, DeleteResponseRequisitionLineError,
        },
        service_provider::{ServiceContext, ServiceProvider},
        InputWithResult,
    };
    use util::inline_init;

    use crate::BatchMutations;

    type ServiceInput = BatchResponseRequisition;
    type ServiceResult = BatchResponseRequisitionResult;

    type Method = dyn Fn(ServiceInput) -> Result<ServiceResult, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl RequisitionServiceTrait for TestService {
        fn batch_response_requisition(
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
        service_provider.requisition_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_batch_request_requisition() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            BatchMutations,
            "test_graphql_batch_request_requisition",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation mut($input: BatchResponseRequisitionInput!, $storeId: String!) {
            batchResponseRequisition(input: $input, storeId: $storeId) {
              deleteResponseRequisitionLines {
                response {
                  ... on DeleteResponseRequisitionLineError {
                    error {
                      __typename
                    }
                  }
                }
                id
              }
            }
          }

        "#;

        let expected = json!({
            "batchResponseRequisition": {
              "deleteResponseRequisitionLines": [
                {
                  "id": "id4",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
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
                delete_line: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteResponseRequisitionLine| {
                        input.id = "id4".to_string()
                    }),
                    result: Err(DeleteResponseRequisitionLineError::RequisitionLineDoesNotExist {}),
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

        // Success

        let expected = json!({
            "batchResponseRequisition": {
              "deleteResponseRequisitionLines": [
                {
                  "id": "id3",
                  "response": {}
                }
              ],
            }
          }
        );

        let test_service = TestService(Box::new(|_| {
            Ok(ServiceResult {
                delete_line: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteResponseRequisitionLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Ok("id3".to_string()),
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
    }
}
