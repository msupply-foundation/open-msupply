use async_graphql::*;
use graphql_core::ContextExt;
use graphql_requisition::mutations::request_requisition;
use graphql_requisition_line::mutations::request_requisition_line;
use repository::Requisition;
use repository::RequisitionLine;
use service::requisition::request_requisition::DeleteRequestRequisition;
use service::requisition::request_requisition::DeleteRequestRequisitionError;
use service::requisition_line::request_requisition_line::InsertRequestRequisitionLine;
use service::requisition_line::request_requisition_line::InsertRequestRequisitionLineError;
use service::requisition_line::request_requisition_line::UpdateRequestRequisitionLine;
use service::requisition_line::request_requisition_line::UpdateRequestRequisitionLineError;
use service::InputWithResult;
use service::{
    requisition::request_requisition::{
        BatchRequestRequisition, BatchRequestRequisitionResult, InsertRequestRequisition,
        InsertRequestRequisitionError, UpdateRequestRequisition, UpdateRequestRequisitionError,
    },
    requisition_line::request_requisition_line::{
        DeleteRequestRequisitionLine, DeleteRequestRequisitionLineError,
    },
};

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertRequestRequisitionResponseWithId",
    params(request_requisition::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateRequestRequisitionResponseWithId",
    params(request_requisition::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteRequestRequisitionResponseWithId",
    params(request_requisition::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertRequestRequisitionLineResponseWithId",
    params(request_requisition_line::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateRequestRequisitionLineResponseWithId",
    params(request_requisition_line::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteRequestRequisitionLineResponseWithId",
    params(request_requisition_line::DeleteResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

#[derive(SimpleObject)]
pub struct BatchRequestRequisitionResponse {
    insert_request_requisitions: Option<Vec<MutationWithId<request_requisition::InsertResponse>>>,
    insert_request_requisition_lines:
        Option<Vec<MutationWithId<request_requisition_line::InsertResponse>>>,
    update_request_requisition_lines:
        Option<Vec<MutationWithId<request_requisition_line::UpdateResponse>>>,
    delete_request_requisition_lines:
        Option<Vec<MutationWithId<request_requisition_line::DeleteResponse>>>,
    update_request_requisitions: Option<Vec<MutationWithId<request_requisition::UpdateResponse>>>,
    delete_request_requisitions: Option<Vec<MutationWithId<request_requisition::DeleteResponse>>>,
}

#[derive(InputObject)]
pub struct BatchRequestRequisitionInput {
    pub insert_request_requisitions: Option<Vec<request_requisition::InsertInput>>,
    pub insert_request_requisition_lines: Option<Vec<request_requisition_line::InsertInput>>,
    pub update_request_requisition_lines: Option<Vec<request_requisition_line::UpdateInput>>,
    pub delete_request_requisition_lines: Option<Vec<request_requisition_line::DeleteInput>>,
    pub update_request_requisitions: Option<Vec<request_requisition::UpdateInput>>,
    pub delete_request_requisitions: Option<Vec<request_requisition::DeleteInput>>,
    pub continue_on_error: Option<bool>,
}

pub fn batch_request_requisition(
    ctx: &Context<'_>,
    store_id: &str,
    input: BatchRequestRequisitionInput,
) -> Result<BatchRequestRequisitionResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = service_provider
        .requisition_service
        .batch_request_requisition(&service_context, store_id, input.to_domain())?;

    Ok(BatchRequestRequisitionResponse::from_domain(response)?)
}

impl BatchRequestRequisitionInput {
    fn to_domain(self) -> BatchRequestRequisition {
        let BatchRequestRequisitionInput {
            insert_request_requisitions,
            insert_request_requisition_lines,
            update_request_requisition_lines,
            delete_request_requisition_lines,
            update_request_requisitions,
            delete_request_requisitions,
            continue_on_error,
        } = self;

        BatchRequestRequisition {
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

pub trait VecOrNone<T> {
    fn vec_or_none(self) -> Option<Vec<T>>;
}

impl<T> VecOrNone<T> for Vec<T> {
    fn vec_or_none(self) -> Option<Vec<T>> {
        if self.is_empty() {
            None
        } else {
            Some(self)
        }
    }
}

impl BatchRequestRequisitionResponse {
    fn from_domain(
        BatchRequestRequisitionResult {
            insert_requisition,
            insert_line,
            update_line,
            delete_line,
            update_requisition,
            delete_requisition,
        }: BatchRequestRequisitionResult,
    ) -> Result<BatchRequestRequisitionResponse> {
        let insert_request_requisitions_result: Result<
            Vec<MutationWithId<request_requisition::InsertResponse>>,
        > = insert_requisition
            .into_iter()
            .map(map_insert_requisition)
            .collect();

        let insert_request_requisition_lines_result: Result<
            Vec<MutationWithId<request_requisition_line::InsertResponse>>,
        > = insert_line.into_iter().map(map_insert_line).collect();

        let update_request_requisition_lines_result: Result<
            Vec<MutationWithId<request_requisition_line::UpdateResponse>>,
        > = update_line.into_iter().map(map_update_line).collect();

        let delete_request_requisition_lines_result: Result<
            Vec<MutationWithId<request_requisition_line::DeleteResponse>>,
        > = delete_line.into_iter().map(map_delete_line).collect();

        let update_request_requisitions_result: Result<
            Vec<MutationWithId<request_requisition::UpdateResponse>>,
        > = update_requisition
            .into_iter()
            .map(map_update_requisition)
            .collect();

        let delete_request_requisitions_result: Result<
            Vec<MutationWithId<request_requisition::DeleteResponse>>,
        > = delete_requisition
            .into_iter()
            .map(map_delete_requisition)
            .collect();

        let result = BatchRequestRequisitionResponse {
            insert_request_requisitions: insert_request_requisitions_result?.vec_or_none(),
            insert_request_requisition_lines: insert_request_requisition_lines_result?
                .vec_or_none(),
            update_request_requisition_lines: update_request_requisition_lines_result?
                .vec_or_none(),
            delete_request_requisition_lines: delete_request_requisition_lines_result?
                .vec_or_none(),
            update_request_requisitions: update_request_requisitions_result?.vec_or_none(),
            delete_request_requisitions: delete_request_requisitions_result?.vec_or_none(),
        };

        Ok(result)
    }
}

fn map_insert_requisition(
    from: InputWithResult<
        InsertRequestRequisition,
        Result<Requisition, InsertRequestRequisitionError>,
    >,
) -> Result<MutationWithId<request_requisition::InsertResponse>> {
    let response = match request_requisition::insert::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_update_requisition(
    from: InputWithResult<
        UpdateRequestRequisition,
        Result<Requisition, UpdateRequestRequisitionError>,
    >,
) -> Result<MutationWithId<request_requisition::UpdateResponse>> {
    let response = match request_requisition::update::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_delete_requisition(
    from: InputWithResult<DeleteRequestRequisition, Result<String, DeleteRequestRequisitionError>>,
) -> Result<MutationWithId<request_requisition::DeleteResponse>> {
    let response = match request_requisition::delete::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_insert_line(
    from: InputWithResult<
        InsertRequestRequisitionLine,
        Result<RequisitionLine, InsertRequestRequisitionLineError>,
    >,
) -> Result<MutationWithId<request_requisition_line::InsertResponse>> {
    let response = match request_requisition_line::insert::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_update_line(
    from: InputWithResult<
        UpdateRequestRequisitionLine,
        Result<RequisitionLine, UpdateRequestRequisitionLineError>,
    >,
) -> Result<MutationWithId<request_requisition_line::UpdateResponse>> {
    let response = match request_requisition_line::update::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_delete_line(
    from: InputWithResult<
        DeleteRequestRequisitionLine,
        Result<String, DeleteRequestRequisitionLineError>,
    >,
) -> Result<MutationWithId<request_requisition_line::DeleteResponse>> {
    let response = match request_requisition_line::delete::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        mock::MockDataInserts, Name, RepositoryError, RequisitionLine, StorageConnectionManager,
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
    type ServiceResponse = BatchRequestRequisitionResult;

    type Method =
        dyn Fn(&str, ServiceInput) -> Result<ServiceResponse, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl RequisitionServiceTrait for TestService {
        fn batch_request_requisition(
            &self,
            _: &ServiceContext,
            store_id: &str,
            input: ServiceInput,
        ) -> Result<ServiceResponse, RepositoryError> {
            self.0(store_id, input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.requisition_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_batch_request_requisition() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
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
                      "__typename": "RecordDoesNotExist"
                    }
                  }
                }
              ],
              "deleteRequestRequisitionLines": [
                {
                  "id": "id4",
                  "response": {
                    "error": {
                      "__typename": "RecordDoesNotExist"
                    }
                  }
                }
              ],
              "updateRequestRequisitions": [
                {
                  "id": "id5",
                  "response": {
                    "error": {
                      "__typename": "RecordDoesNotExist"
                    }
                  }
                }
              ],
              "deleteRequestRequisitions": [
                {
                  "id": "id6",
                  "response": {
                    "error": {
                      "__typename": "RecordDoesNotExist"
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
        let test_service = TestService(Box::new(|_, _| {
            Ok(BatchRequestRequisitionResult {
                insert_requisition: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertRequestRequisition| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertRequestRequisitionError::OtherPartyNotASupplier(
                        Name::default(),
                    )),
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
        let test_service = TestService(Box::new(|_, _| {
            Ok(BatchRequestRequisitionResult {
                insert_requisition: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertRequestRequisition| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertRequestRequisitionError::OtherPartyNotASupplier(
                        Name::default(),
                    )),
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

        let test_service = TestService(Box::new(|_, _| {
            Ok(BatchRequestRequisitionResult {
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
