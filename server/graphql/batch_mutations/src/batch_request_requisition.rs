use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_requisition::mutations::request_requisition;
use graphql_requisition_line::mutations::request_requisition_line;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::request_requisition::*,
};

use crate::{to_standard_error, VecOrNone};

type ServiceResult = BatchRequestRequisitionResult;
type ServiceInput = BatchRequestRequisition;

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertRequestRequisitionResponseWithId",
    params(request_requisition::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateRequestRequisitionResponseWithId",
    params(request_requisition::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteRequestRequisitionResponseWithId",
    params(request_requisition::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertRequestRequisitionLineResponseWithId",
    params(request_requisition_line::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateRequestRequisitionLineResponseWithId",
    params(request_requisition_line::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteRequestRequisitionLineResponseWithId",
    params(request_requisition_line::delete::DeleteResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

type InsertRequisitionsResponse =
    Option<Vec<MutationWithId<request_requisition::insert::InsertResponse>>>;
type InsertRequisitionLinesResponse =
    Option<Vec<MutationWithId<request_requisition_line::insert::InsertResponse>>>;
type UpdateRequisitionLinesResponse =
    Option<Vec<MutationWithId<request_requisition_line::update::UpdateResponse>>>;
type DeleteRequisitionLinesResponse =
    Option<Vec<MutationWithId<request_requisition_line::delete::DeleteResponse>>>;
type UpdateRequisitionsResponse =
    Option<Vec<MutationWithId<request_requisition::update::UpdateResponse>>>;
type DeleteRequisitionsResponse =
    Option<Vec<MutationWithId<request_requisition::delete::DeleteResponse>>>;

#[derive(SimpleObject)]
#[graphql(name = "BatchRequestRequisitionResponse")]
pub struct BatchResponse {
    insert_request_requisitions: InsertRequisitionsResponse,
    insert_request_requisition_lines: InsertRequisitionLinesResponse,
    update_request_requisition_lines: UpdateRequisitionLinesResponse,
    delete_request_requisition_lines: DeleteRequisitionLinesResponse,
    update_request_requisitions: UpdateRequisitionsResponse,
    delete_request_requisitions: DeleteRequisitionsResponse,
}

#[derive(InputObject)]
#[graphql(name = "BatchRequestRequisitionInput")]
pub struct BatchInput {
    pub insert_request_requisitions: Option<Vec<request_requisition::insert::InsertInput>>,
    pub insert_request_requisition_lines:
        Option<Vec<request_requisition_line::insert::InsertInput>>,
    pub update_request_requisition_lines:
        Option<Vec<request_requisition_line::update::UpdateInput>>,
    pub delete_request_requisition_lines:
        Option<Vec<request_requisition_line::delete::DeleteInput>>,
    pub update_request_requisitions: Option<Vec<request_requisition::update::UpdateInput>>,
    pub delete_request_requisitions: Option<Vec<request_requisition::delete::DeleteInput>>,
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
        .batch_request_requisition(&service_context, input.to_domain())?;

    Ok(BatchResponse::from_domain(response)?)
}

impl BatchInput {
    fn to_domain(self) -> ServiceInput {
        let BatchInput {
            insert_request_requisitions,
            insert_request_requisition_lines,
            update_request_requisition_lines,
            delete_request_requisition_lines,
            update_request_requisitions,
            delete_request_requisitions,
            continue_on_error,
        } = self;

        ServiceInput {
            insert_requisition: insert_request_requisitions
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_line: insert_request_requisition_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_line: update_request_requisition_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_line: delete_request_requisition_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_requisition: update_request_requisitions
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_requisition: delete_request_requisitions
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            continue_on_error,
        }
    }
}

impl BatchResponse {
    fn from_domain(
        ServiceResult {
            insert_requisition,
            insert_line,
            update_line,
            delete_line,
            update_requisition,
            delete_requisition,
        }: ServiceResult,
    ) -> Result<BatchResponse> {
        let result = BatchResponse {
            insert_request_requisitions: map_insert_requisitions(insert_requisition)?,
            insert_request_requisition_lines: map_insert_lines(insert_line)?,
            update_request_requisition_lines: map_update_lines(update_line)?,
            delete_request_requisition_lines: map_delete_lines(delete_line)?,
            update_request_requisitions: map_update_requisitions(update_requisition)?,
            delete_request_requisitions: map_delete_requisitions(delete_requisition)?,
        };

        Ok(result)
    }
}

fn map_insert_requisitions(
    responses: InsertRequisitionsResult,
) -> Result<InsertRequisitionsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match request_requisition::insert::map_response(response.result) {
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

fn map_update_requisitions(
    responses: UpdateRequisitionsResult,
) -> Result<UpdateRequisitionsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match request_requisition::update::map_response(response.result) {
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

fn map_delete_requisitions(
    responses: DeleteRequisitionsResult,
) -> Result<DeleteRequisitionsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match request_requisition::delete::map_response(response.result) {
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

fn map_insert_lines(
    responses: InsertRequisitionLinesResult,
) -> Result<InsertRequisitionLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match request_requisition_line::insert::map_response(response.result)
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

fn map_update_lines(
    responses: UpdateRequisitionLinesResult,
) -> Result<UpdateRequisitionLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match request_requisition_line::update::map_response(response.result)
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

fn map_delete_lines(
    responses: DeleteRequisitionLinesResult,
) -> Result<DeleteRequisitionLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match request_requisition_line::delete::map_response(response.result)
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
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::MockDataInserts, RepositoryError, RequisitionLine, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        requisition::{
            request_requisition::{
                BatchRequestRequisition, BatchRequestRequisitionResult, DeleteRequestRequisition,
                DeleteRequestRequisitionError, InsertRequestRequisition,
                InsertRequestRequisitionError, UpdateRequestRequisition,
                UpdateRequestRequisitionError,
            },
            RequisitionServiceTrait,
        },
        requisition_line::request_requisition_line::{
            DeleteRequestRequisitionLine, DeleteRequestRequisitionLineError,
            InsertRequestRequisitionLine, InsertRequestRequisitionLineError,
            UpdateRequestRequisitionLine, UpdateRequestRequisitionLineError,
        },
        service_provider::{ServiceContext, ServiceProvider},
        InputWithResult,
    };
    use util::inline_init;

    use crate::BatchMutations;

    type ServiceInput = BatchRequestRequisition;
    type ServiceResult = BatchRequestRequisitionResult;

    type Method = dyn Fn(ServiceInput) -> Result<ServiceResult, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl RequisitionServiceTrait for TestService {
        fn batch_request_requisition(
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
        mutation mut($input: BatchRequestRequisitionInput!, $storeId: String!) {
            batchRequestRequisition(input: $input, storeId: $storeId) {
              insertRequestRequisitions {
                id
                response {
                  ... on InsertRequestRequisitionError {
                    error {
                      __typename
                    }
                  }
                }
              }
              insertRequestRequisitionLines {
                id
                response {
                  ... on InsertRequestRequisitionLineError {
                    error {
                      __typename
                    }
                  }
                }
              }
              updateRequestRequisitionLines {
                id
                response {
                  ... on UpdateRequestRequisitionLineError {
                    error {
                      __typename
                    }
                  }
                  ... on RequisitionLineNode {
                      id
                  }
                }
              }
              deleteRequestRequisitionLines {
                response {
                  ... on DeleteRequestRequisitionLineError {
                    error {
                      __typename
                    }
                  }
                }
                id
              }
              updateRequestRequisitions {
                id
                response {
                  ... on UpdateRequestRequisitionError {
                    error {
                      __typename
                    }
                  }
                }
              }
              deleteRequestRequisitions {
                id
                response {
                  ... on DeleteRequestRequisitionError {
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
            "batchRequestRequisition": {
              "insertRequestRequisitions": [
                {
                  "id": "id1",
                  "response": {
                    "error": {
                      "__typename": "OtherPartyNotASupplier"
                    }
                  }
                }
              ],

              "insertRequestRequisitionLines": [
                {
                  "id": "id2",
                  "response": {
                    "error": {
                      "__typename": "ForeignKeyError"
                    }
                  }
                }
              ],
              "updateRequestRequisitionLines": [
                {
                  "id": "id3",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deleteRequestRequisitionLines": [
                {
                  "id": "id4",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "updateRequestRequisitions": [
                {
                  "id": "id5",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deleteRequestRequisitions": [
                {
                  "id": "id6",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ]
            }
          }
        );

        let variables = Some(json!({
            "storeId": "n/a",
            "input": {}
        }
        ));

        // Structured Errors
        let test_service = TestService(Box::new(|_| {
            Ok(ServiceResult {
                insert_requisition: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertRequestRequisition| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertRequestRequisitionError::OtherPartyNotASupplier),
                }],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertRequestRequisitionLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertRequestRequisitionLineError::RequisitionDoesNotExist {}),
                }],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateRequestRequisitionLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Err(UpdateRequestRequisitionLineError::RequisitionLineDoesNotExist {}),
                }],
                delete_line: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteRequestRequisitionLine| {
                        input.id = "id4".to_string()
                    }),
                    result: Err(DeleteRequestRequisitionLineError::RequisitionLineDoesNotExist {}),
                }],
                update_requisition: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateRequestRequisition| {
                        input.id = "id5".to_string()
                    }),
                    result: Err(UpdateRequestRequisitionError::RequisitionDoesNotExist {}),
                }],
                delete_requisition: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteRequestRequisition| {
                        input.id = "id6".to_string()
                    }),
                    result: Err(DeleteRequestRequisitionError::RequisitionDoesNotExist {}),
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
                insert_requisition: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertRequestRequisition| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertRequestRequisitionError::OtherPartyNotASupplier),
                }],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertRequestRequisitionLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertRequestRequisitionLineError::RequisitionDoesNotExist {}),
                }],
                update_line: vec![],
                delete_line: vec![],
                update_requisition: vec![],
                delete_requisition: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteRequestRequisition| {
                        input.id = "id6".to_string()
                    }),
                    result: Err(DeleteRequestRequisitionError::NotARequestRequisition {}),
                }],
            })
        }));
        let expected_message = "Bad user input";
        let expected_extensions = json!({
            "input":
                format!(
                    "{:#?}",
                    inline_init(|input: &mut DeleteRequestRequisition| {
                        input.id = "id6".to_string()
                    })
                )
        });
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
            "batchRequestRequisition": {
              "deleteRequestRequisitionLines": null,
              "deleteRequestRequisitions": null,
              "insertRequestRequisitionLines": null,
              "insertRequestRequisitions": null,
              "updateRequestRequisitionLines": [
                {
                  "id": "id3",
                  "response": {
                    "id": "id3"
                  }
                }
              ],
              "updateRequestRequisitions": null
            }
          }
        );

        let test_service = TestService(Box::new(|_| {
            Ok(ServiceResult {
                insert_requisition: vec![],
                insert_line: vec![],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateRequestRequisitionLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Ok(inline_init(|input: &mut RequisitionLine| {
                        input.requisition_line_row.id = "id3".to_string()
                    })),
                }],
                delete_line: vec![],
                update_requisition: vec![],
                delete_requisition: vec![],
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
