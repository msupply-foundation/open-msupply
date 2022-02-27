mod graphql {
    use crate::graphql::assert_graphql_query;
    use repository::{
        mock::{
            mock_outbound_shipment_a, mock_outbound_shipment_a_invoice_lines, mock_stock_line_a,
            MockDataInserts,
        },
        InvoiceLine, StockLine, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        location::{
            delete::{DeleteLocation, DeleteLocationError, LocationInUse},
            LocationServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type DeleteLocationMethod =
        dyn Fn(DeleteLocation) -> Result<String, DeleteLocationError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLocationMethod>);

    impl LocationServiceTrait for TestService {
        fn delete_location(
            &self,
            _: &ServiceContext,
            _: &str,
            input: DeleteLocation,
        ) -> Result<String, DeleteLocationError> {
            (self.0)(input)
        }
    }

    pub fn service_provider(
        location_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.location_service = Box::new(location_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_delete_location_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_delete_location_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteLocationInput!) {
            deleteLocation(input: $input, storeId: \"store_a\") {
              ... on DeleteLocationError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
          }
        }));

        // Record Not Found
        let test_service =
            TestService(Box::new(|_| Err(DeleteLocationError::LocationDoesNotExist)));

        let expected = json!({
            "deleteLocation": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Not current store location
        let test_service = TestService(Box::new(|_| {
            Err(DeleteLocationError::LocationDoesNotBelongToCurrentStore)
        }));

        let expected = json!({
            "deleteLocation": {
              "error": {
                "__typename": "RecordBelongsToAnotherStore",
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Location in use
        let mutation = r#"
        mutation ($input: DeleteLocationInput!) {
            deleteLocation(input: $input, storeId: \"store_a\") {
              ... on DeleteLocationError {
                error {
                  __typename
                  ... on LocationInUse {
                    stockLines {
                      nodes {
                        id
                      }
                    }
                    invoiceLines {
                      nodes {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        "#;

        pub fn successfull_invoice_line() -> InvoiceLine {
            InvoiceLine {
                invoice_line_row: mock_outbound_shipment_a_invoice_lines()[0].clone(),
                invoice_row: mock_outbound_shipment_a(),
                location_row_option: None,
            }
        }

        let test_service = TestService(Box::new(|_| {
            Err(DeleteLocationError::LocationInUse(LocationInUse {
                stock_lines: vec![StockLine {
                    stock_line_row: mock_stock_line_a(),
                    location_row: None,
                }],
                invoice_lines: vec![successfull_invoice_line()],
            }))
        }));

        // let invoice_line_ids = stock_lines.iter();
        let out_line = successfull_invoice_line();
        let expected = json!({
            "deleteLocation": {
              "error": {
                "__typename": "LocationInUse",
                "stockLines": {
                  "nodes": [{"id": mock_stock_line_a().id}]
                },
                "invoiceLines": {
                  "nodes": [{"id": out_line.invoice_line_row.id}]
                }
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_delete_location_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_delete_location_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteLocationInput!) {
            deleteLocation(input: $input, storeId: \"store_a\") {
              ... on DeleteResponse {
                id
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",

          }
        }));

        let test_service = TestService(Box::new(|_| Ok("deleted".to_owned())));

        let expected = json!({
            "deleteLocation": {
                "id": "deleted",
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
