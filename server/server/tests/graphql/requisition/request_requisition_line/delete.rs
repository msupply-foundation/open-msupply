mod graphql {
    use crate::graphql::{assert_graphql_query, assert_standard_graphql_error};
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        requisition_line::{
            request_requisition_line::{
                DeleteRequestRequisitionLine as ServiceInput,
                DeleteRequestRequisitionLineError as ServiceError,
            },
            RequisitionLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type DeleteLineMethod =
        dyn Fn(&str, ServiceInput) -> Result<String, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLineMethod>);

    impl RequisitionLineServiceTrait for TestService {
        fn delete_request_requisition_line(
            &self,
            _: &ServiceContext,
            store_id: &str,
            input: ServiceInput,
        ) -> Result<String, ServiceError> {
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
    async fn test_graphql_delete_request_requisition_line_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_delete_request_requisition_line_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteRequestRequisitionLineInput!, $storeId: String) {
            deleteRequestRequisitionLine(storeId: $storeId, input: $input) {
              ... on DeleteRequestRequisitionLineError {
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
            "deleteRequestRequisitionLine": {
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

        // CannotEditRequisition
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::CannotEditRequisition)));

        let expected = json!({
            "deleteRequestRequisitionLine": {
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

        // RequisitionDoesNotExist
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::RequisitionDoesNotExist)));
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
    async fn test_graphql_delete_request_requisition_line_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_delete_request_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: DeleteRequestRequisitionLineInput!) {
            deleteRequestRequisitionLine(storeId: $storeId, input: $input) {
                ... on DeleteResponse {
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
                    id: "id input".to_string(),
                }
            );
            Ok("deleted id".to_owned())
        }));

        let variables = json!({
          "input": {
            "id": "id input",
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "deleteRequestRequisitionLine": {
                "id": "deleted id"
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
