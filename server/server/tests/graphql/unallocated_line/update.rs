mod graphql {
    use crate::graphql::{
        assert_graphql_query, assert_standard_graphql_error,
        unallocated_line::successfull_invoice_line,
    };
    use domain::invoice_line::InvoiceLine;
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        invoice_line::{
            OutboundShipmentLineServiceTrait,
            UpdateOutboundShipmentUnallocatedLine as ServiceInput,
            UpdateOutboundShipmentUnallocatedLineError as ServiceError,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type UpdateLineMethod = dyn Fn(ServiceInput) -> Result<InvoiceLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl OutboundShipmentLineServiceTrait for TestService {
        fn update_outbound_shipment_unallocated_line(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<InvoiceLine, ServiceError> {
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
            "quantity": 0,
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_unallocated_structured_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_update_unallocated_line_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateOutboundShipmentUnallocatedLineInput!) {
            updateOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
              ... on UpdateOutboundShipmentUnallocatedLineError {
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
            "updateOutboundShipmentUnallocatedLine": {
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
    async fn test_graphql_update_unallocated_standard_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_update_unallocated_line_standard_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateOutboundShipmentUnallocatedLineInput!) {
            updateOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
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
                    "Update unallocated line n/a: {:#?}",
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
    async fn test_graphql_update_unallocated_line_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_update_unallocated_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateOutboundShipmentUnallocatedLineInput!) {
            updateOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
                ... on InvoiceLineNode {
                    id
                    invoiceId
                    itemName
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|_| Ok(successfull_invoice_line())));
        let out_line = successfull_invoice_line();
        let expected = json!({
            "updateOutboundShipmentUnallocatedLine": {
                "id": out_line.id,
                "invoiceId": out_line.invoice_id,
                "itemName": out_line.item_name
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
