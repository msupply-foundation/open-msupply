mod graphql {
    use crate::graphql::{assert_graphql_query, assert_standard_graphql_error};
    use repository::Name;
    use repository::{
        mock::{mock_name_a, mock_request_draft_requisition, MockDataInserts},
        Requisition, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        requisition::{
            request_requisition::{
                InsertRequestRequisition as ServiceInput,
                InsertRequestRequisitionError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type InsertLineMethod =
        dyn Fn(&str, ServiceInput) -> Result<Requisition, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn insert_request_requisition(
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
            "otherPartyId": "n/a",
            "maxMonthsOfStock": 0,
            "minMonthsOfStock": 0
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_request_requisition_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_insert_request_requisition_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertRequestRequisitionInput!, $storeId: String) {
            insertRequestRequisition(storeId: $storeId, input: $input) {
              ... on InsertRequestRequisitionError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // OtherPartyNotASupplier
        let test_service = TestService(Box::new(|_, _| {
            Err(ServiceError::OtherPartyNotASupplier(Name {
                name_row: mock_name_a(),
                name_store_join_row: None,
                store_row: None,
            }))
        }));

        let expected = json!({
            "insertRequestRequisition": {
              "error": {
                "__typename": "OtherPartyNotASupplier"
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

        // RequisitionAlreadyExists
        let test_service =
            TestService(Box::new(|_, _| Err(ServiceError::RequisitionAlreadyExists)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // OtherPartyDoesNotExist
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::OtherPartyDoesNotExist)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // OtherPartyIsThisStore
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::OtherPartyIsThisStore)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // OtherPartyIsNotAStore
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::OtherPartyIsNotAStore)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // OtherPartyIsNotAStore
        let test_service = TestService(Box::new(|_, _| {
            Err(ServiceError::NewlyCreatedRequisitionDoesNotExist)
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
    async fn test_graphql_insert_request_requisition_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_insert_request_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: InsertRequestRequisitionInput!) {
            insertRequestRequisition(storeId: $storeId, input: $input) {
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
                    other_party_id: "other party input".to_string(),
                    colour: Some("colour input".to_string()),
                    their_reference: Some("reference input".to_string()),
                    comment: Some("comment input".to_string()),
                    max_months_of_stock: 1.0,
                    min_months_of_stock: 2.0
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
            "otherPartyId": "other party input",
            "maxMonthsOfStock": 1,
            "minMonthsOfStock": 2,
            "colour": "colour input",
            "theirReference": "reference input",
            "comment": "comment input",
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "insertRequestRequisition": {
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
