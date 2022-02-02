mod graphql {
    use crate::graphql::{assert_graphql_query, assert_standard_graphql_error};
    use repository::{
        mock::{
            mock_request_draft_requisition, mock_sent_request_requisition_line, MockDataInserts,
        },
        RequisitionLine, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        requisition_line::{
            request_requisition_line::{
                UpdateRequestRequisitionLine as ServiceInput,
                UpdateRequestRequisitionLineError as ServiceError,
            },
            RequisitionLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type UpdateLineMethod =
        dyn Fn(&str, ServiceInput) -> Result<RequisitionLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl RequisitionLineServiceTrait for TestService {
        fn update_request_requisition_line(
            &self,
            _: &ServiceContext,
            store_id: &str,
            input: ServiceInput,
        ) -> Result<RequisitionLine, ServiceError> {
            self.0(store_id, input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.requisition_line_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_request_requisition_line_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_update_request_requisition_line_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateRequestRequisitionLineInput!, $storeId: String) {
            updateRequestRequisitionLine(storeId: $storeId, input: $input) {
              ... on UpdateRequestRequisitionLineError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RecordDoesNotExist
        let test_service = TestService(Box::new(|_, _| {
            Err(ServiceError::RequisitionLineDoesNotExist)
        }));

        let expected = json!({
            "updateRequestRequisitionLine": {
              "error": {
                "__typename": "RecordDoesNotExist"
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
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::RequisitionDoesNotExist)));

        let expected = json!({
            "updateRequestRequisitionLine": {
              "error": {
                "__typename": "ForeignKeyError"
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

        // CannotEditRequisition
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::CannotEditRequisition)));

        let expected = json!({
            "updateRequestRequisitionLine": {
              "error": {
                "__typename": "CannotEditRequisition"
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

        // NotThisStoreRequisition
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::NotThisStoreRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotARequestRequisition
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::NotARequestRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // UpdatedRequisitionLineDoesNotExist
        let test_service = TestService(Box::new(|_, _| {
            Err(ServiceError::UpdatedRequisitionLineDoesNotExist)
        }));
        let expected_message = "Internal error";
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
    async fn test_graphql_update_request_requisition_line_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_update_request_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: UpdateRequestRequisitionLineInput!) {
            updateRequestRequisitionLine(storeId: $storeId, input: $input) {
                ... on RequisitionLineNode {
                    id
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|store_id, input| {
            assert_eq!(store_id, "store_a");
            assert_eq!(
                input,
                ServiceInput {
                    id: "update line id input".to_string(),
                    requested_quantity: Some(1)
                }
            );
            Ok(RequisitionLine {
                requisition_row: mock_request_draft_requisition(),
                requisition_line_row: mock_sent_request_requisition_line(),
            })
        }));

        let variables = json!({
          "input": {
            "id": "update line id input",
            "requestedQuantity": 1
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateRequestRequisitionLine": {
                "id": mock_sent_request_requisition_line().id
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
