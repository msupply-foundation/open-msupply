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
            InsertOutboundShipmentUnallocatedLine as ServiceInput,
            InsertOutboundShipmentUnallocatedLineError as ServiceError,
            OutboundShipmentLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type InsertLineMethod = dyn Fn(ServiceInput) -> Result<InvoiceLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl OutboundShipmentLineServiceTrait for TestService {
        fn insert_outbound_shipment_unallocated_line(
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
            "invoiceId": "n/a",
            "itemId": "n/a",
            "quantity": 0,
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_unallocated_structured_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_insert_unallocated_line_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertOutboundShipmentUnallocatedLineInput!) {
            insertOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
              ... on InsertOutboundShipmentUnallocatedLineError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // UnallocatedLinesOnlyEditableInNewInvoice
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::CanOnlyAddLinesToNewOutboundShipment)
        }));

        let expected = json!({
            "insertOutboundShipmentUnallocatedLine": {
              "error": {
                "__typename": "UnallocatedLinesOnlyEditableInNewInvoice"
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

        // UnallocatedLineForItemAlreadyExists
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::UnallocatedLineForItemAlreadyExistsInInvoice)
        }));

        let expected = json!({
            "insertOutboundShipmentUnallocatedLine": {
              "error": {
                "__typename": "UnallocatedLineForItemAlreadyExists"
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

        // ForeignKeyError (invoice does not exists)
        let mutation = r#"
        mutation ($input: InsertOutboundShipmentUnallocatedLineInput!) {
            insertOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
                ... on InsertOutboundShipmentUnallocatedLineError {
                    error {
                    __typename
                    ... on ForeignKeyError {
                        key
                    }
                    }
                }
            }
        }
        "#;

        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "insertOutboundShipmentUnallocatedLine": {
              "error": {
                "__typename": "ForeignKeyError",
                "key": "invoiceId"
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
    async fn test_graphql_insert_unallocated_standard_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_insert_unallocated_line_standard_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertOutboundShipmentUnallocatedLineInput!) {
            insertOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
                __typename
            }
          }
        "#;

        // LineAlreadyExists
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineAlreadyExists)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
        // NotAnOutboundShipment
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAnOutboundShipment)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
        // ItemNotFound
        let test_service = TestService(Box::new(|_| Err(ServiceError::ItemNotFound)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
        // NotAStockItem
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAStockItem)));
        let expected_message = "Bad user input";
        let expected_extensions = json!({
            "details":
                format!(
                    "Insert unallocated line n/a: {:#?}",
                    ServiceError::NotAStockItem
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
    async fn test_graphql_insert_unallocated_line_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_insert_unallocated_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertOutboundShipmentUnallocatedLineInput!) {
            insertOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
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
            "insertOutboundShipmentUnallocatedLine": {
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
