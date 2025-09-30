use async_graphql::*;
use graphql_core::{
    simple_generic_errors::MasterListNotFoundForThisStore,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::RequisitionLineConnector;
use repository::RequisitionLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::response_requisition::{
        ResponseAddFromMasterList as ServiceInput, ResponseAddFromMasterListError as ServiceError,
    },
};

#[derive(InputObject)]
pub struct ResponseAddFromMasterListInput {
    pub response_requisition_id: String,
    pub master_list_id: String,
}

#[derive(Interface)]
#[graphql(name = "ResponseAddFromMasterListErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum ResponseAddFromMasterListErrorInterface {
    MasterListNotFoundForThisStore(MasterListNotFoundForThisStore),
}

#[derive(SimpleObject)]
#[graphql(name = "ResponseAddFromMasterListError")]
pub struct ResponseAddFromMasterListError {
    pub error: ResponseAddFromMasterListErrorInterface,
}

#[derive(Union)]
#[graphql(name = "ResponseAddFromMasterListResponse")]
pub enum ResponseAddFromMasterListResponse {
    Error(ResponseAddFromMasterListError),
    Response(RequisitionLineConnector),
}

pub fn response_add_from_master_list(
    ctx: &Context<'_>,
    store_id: &str,
    input: ResponseAddFromMasterListInput,
) -> Result<ResponseAddFromMasterListResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .requisition_service
            .response_add_from_master_list(&service_context, input.to_domain()),
    )
}

impl ResponseAddFromMasterListInput {
    pub fn to_domain(self) -> ServiceInput {
        let ResponseAddFromMasterListInput {
            response_requisition_id,
            master_list_id,
        } = self;
        ServiceInput {
            response_requisition_id,
            master_list_id,
        }
    }
}

fn map_response(
    from: Result<Vec<RequisitionLine>, ServiceError>,
) -> Result<ResponseAddFromMasterListResponse> {
    let result = match from {
        Ok(requisition_lines) => ResponseAddFromMasterListResponse::Response(
            RequisitionLineConnector::from_vec(requisition_lines),
        ),
        Err(error) => ResponseAddFromMasterListResponse::Error(ResponseAddFromMasterListError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

pub fn map_error(error: ServiceError) -> Result<ResponseAddFromMasterListErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::MasterListNotFoundForThisStore => {
            return Ok(
                ResponseAddFromMasterListErrorInterface::MasterListNotFoundForThisStore(
                    MasterListNotFoundForThisStore,
                ),
            )
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition
        | ServiceError::NotAResponseRequisition
        | ServiceError::RequisitionDoesNotExist
        | ServiceError::CannotEditRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use crate::RequisitionMutations;
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{
            mock_item_a, mock_new_response_requisition_for_update_test,
            mock_new_response_requisition_for_update_test_line, MockDataInserts,
        },
        RequisitionLine, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        requisition::{
            response_requisition::{
                ResponseAddFromMasterList as ServiceInput,
                ResponseAddFromMasterListError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type AddFromMasterListMethod =
        dyn Fn(ServiceInput) -> Result<Vec<RequisitionLine>, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<AddFromMasterListMethod>);

    impl RequisitionServiceTrait for TestService {
        fn response_add_from_master_list(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<Vec<RequisitionLine>, ServiceError> {
            self.0(input)
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

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "responseRequisitionId": "n/a",
            "masterListId": "n/a"
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_response_add_from_master_list_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_response_add_from_master_list_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: ResponseAddFromMasterListInput!, $storeId: String) {
            responseAddFromMasterList(storeId: $storeId, input: $input) {
              ... on ResponseAddFromMasterListError {
                error {
                  __typename
                  ... on MasterListNotFoundForThisStore {
                    description
                  }
                }
              }
            }
          }
        "#;

        // MasterListNotFoundForThisStore
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::MasterListNotFoundForThisStore)
        }));

        let expected = json!({
            "responseAddFromMasterList": {
              "error": {
                "__typename": "MasterListNotFoundForThisStore",
                "description": "Master list not found (might not be visible to this store)"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // RequisitionDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::RequisitionDoesNotExist)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // CannotEditRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotEditRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotThisStoreRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotThisStoreRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotAResponseRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAResponseRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_response_add_from_master_list_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_response_add_from_master_list_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: ResponseAddFromMasterListInput!, $storeId: String) {
            responseAddFromMasterList(storeId: $storeId, input: $input) {
              ... on RequisitionLineConnector {
                nodes {
                  id
                }
                totalCount
              }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    response_requisition_id: "id".to_string(),
                    master_list_id: "master list".to_string(),
                }
            );
            Ok(vec![RequisitionLine {
                requisition_line_row: mock_new_response_requisition_for_update_test_line(),
                requisition_row: mock_new_response_requisition_for_update_test(),
                item_row: mock_item_a(),
            }])
        }));

        let variables = json!({
          "input": {
            "responseRequisitionId": "id",
            "masterListId": "master list"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "responseAddFromMasterList": {
              "nodes": [
                {
                  "id": mock_new_response_requisition_for_update_test_line().id
                }
              ]
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
