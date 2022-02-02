mod graphql {
    use crate::graphql::{assert_graphql_query, assert_standard_graphql_error};
    use repository::{
        mock::{mock_name_a, mock_request_draft_requisition, MockDataInserts},
        Requisition, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        requisition::{
            response_requisition::{
                UpdateResponseRequisition as ServiceInput,
                UpdateResponseRequisitionError as ServiceError, UpdateResponseRequstionStatus,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type UpdateLineMethod =
        dyn Fn(&str, ServiceInput) -> Result<Requisition, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn update_response_requisition(
            &self,
            _: &ServiceContext,
            store_id: &str,
            input: ServiceInput,
        ) -> Result<Requisition, ServiceError> {
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

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_response_requisition_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_update_response_requisition_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateResponseRequisitionInput!, $storeId: String) {
            updateResponseRequisition(storeId: $storeId, input: $input) {
              ... on UpdateResponseRequisitionError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RequisitionDoesNotExist
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::RequisitionDoesNotExist)));

        let expected = json!({
            "updateResponseRequisition": {
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
            "updateResponseRequisition": {
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

        // NotAResponseRequisition
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::NotAResponseRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // UpdatedRequisitionDoesNotExist
        let test_service = TestService(Box::new(|_, _| {
            Err(ServiceError::UpdatedRequisitionDoesNotExist)
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
    async fn test_graphql_update_response_requisition_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_update_response_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: UpdateResponseRequisitionInput!) {
            updateResponseRequisition(storeId: $storeId, input: $input) {
                ... on RequisitionNode {
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
                    colour: Some("colour input".to_string()),
                    their_reference: Some("reference input".to_string()),
                    comment: Some("comment input".to_string()),
                    status: Some(UpdateResponseRequstionStatus::Finalised)
                }
            );
            Ok(Requisition {
                requisition_row: mock_request_draft_requisition(),
                name_row: mock_name_a(),
            })
        }));

        let variables = json!({
          "input": {
            "id": "id input",

            "colour": "colour input",
            "theirReference": "reference input",
            "comment": "comment input",
            "status": "FINALISED"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateResponseRequisition": {
                "id": mock_request_draft_requisition().id
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
