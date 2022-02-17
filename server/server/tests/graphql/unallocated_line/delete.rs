mod graphql {
    use crate::graphql::{assert_graphql_query, assert_standard_graphql_error};
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        invoice_line::{
            DeleteOutboundShipmentUnallocatedLine as ServiceInput,
            DeleteOutboundShipmentUnallocatedLineError as ServiceError,
            OutboundShipmentLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type DeleteLineMethod = dyn Fn(ServiceInput) -> Result<String, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLineMethod>);

    impl OutboundShipmentLineServiceTrait for TestService {
        fn delete_outbound_shipment_unallocated_line(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<String, ServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.outbound_shipment_line = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_delete_unallocated_structured_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_delete_unallocated_line_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteOutboundShipmentUnallocatedLineInput!) {
            deleteOutboundShipmentUnallocatedLine(input: $input) {
              ... on DeleteOutboundShipmentUnallocatedLineError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RecordDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineDoesNotExist)));

        let expected = json!({
            "deleteOutboundShipmentUnallocatedLine": {
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
    }

    #[actix_rt::test]
    async fn test_graphql_delete_unallocated_standard_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_delete_unallocated_line_standard_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteOutboundShipmentUnallocatedLineInput!) {
            deleteOutboundShipmentUnallocatedLine(input: $input) {
                __typename
            }
          }
        "#;

        // LineIsNotUnallocatedLine
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineIsNotUnallocatedLine)));
        let expected_message = "Bad user input";
        let expected_extensions = json!({
            "details":
                format!(
                    "Delete unallocated line n/a: {:#?}",
                    ServiceError::LineIsNotUnallocatedLine
                )
        });
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            Some(expected_extensions),
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_delete_unallocated_line_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_delete_unallocated_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteOutboundShipmentUnallocatedLineInput!) {
            deleteOutboundShipmentUnallocatedLine(input: $input) {
                ... on DeleteResponse {
                    id
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|_| Ok("deleted".to_owned())));
        let expected = json!({
            "deleteOutboundShipmentUnallocatedLine": {
                "id": "deleted",
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
    }
}
