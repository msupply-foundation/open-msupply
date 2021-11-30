mod graphql {
    use crate::graphql::{assert_gql_query, ServiceOverride};
    use domain::{invoice_line::InvoiceLine, location::DeleteLocation, stock_line::StockLine};
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::location::delete::{DeleteLocationError, DeleteLocationServiceTrait};

    type DeleteLocationMethod =
        dyn Fn(DeleteLocation) -> Result<String, DeleteLocationError> + Sync + Send;

    struct TestService(pub Box<DeleteLocationMethod>);

    impl DeleteLocationServiceTrait for TestService {
        fn delete_location(&self, input: DeleteLocation) -> Result<String, DeleteLocationError> {
            (self.0)(input)
        }
    }

    macro_rules! service_override {
        ($closure:expr) => {{
            ServiceOverride::new()
                .set_delete_location_service(Box::new(|| Box::new(TestService(Box::new($closure)))))
        }};
    }

    #[actix_rt::test]
    async fn test_graphql_delete_location_errors() {
        let (_, _, settings) = setup_all(
            "test_graphql_delete_location_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteLocationInput!) {
            deleteLocation(input: $input) {
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
        let service_override =
            service_override!(|_| Err(DeleteLocationError::LocationDoesNotExist));

        let expected = json!({
            "deleteLocation": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_override),
        )
        .await;

        // Not current store location
        let service_override =
            service_override!(|_| Err(DeleteLocationError::LocationDoesNotBelongToCurrentStore));

        let expected = json!({
            "deleteLocation": {
              "error": {
                "__typename": "RecordBelongsToAnotherStore",
              }
            }
          }
        );

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_override),
        )
        .await;

        // Location in use
        let mutation = r#"
        mutation ($input: DeleteLocationInput!) {
            deleteLocation(input: $input) {
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

        let service_override = service_override!(|_| Err(DeleteLocationError::LocationInUse {
            stock_lines: vec![StockLine {
                id: "stock_line_id".to_owned(),
                item_id: "n/a".to_owned(),
                store_id: "n/a".to_owned(),
                location_id: None,
                location_name: None,
                batch: None,
                pack_size: 1,
                cost_price_per_pack: 1.0,
                sell_price_per_pack: 1.0,
                available_number_of_packs: 1,
                total_number_of_packs: 1,
                expiry_date: None,
                on_hold: false,
                note: None
            }],
            invoice_lines: vec![InvoiceLine {
                id: "invoice_line_id".to_owned(),
                stock_line_id: None,
                invoice_id: "n/a".to_owned(),
                location_id: None,
                location_name: None,
                item_id: "n/a".to_owned(),
                item_name: "n/a".to_owned(),
                item_code: "n/a".to_owned(),
                number_of_packs: 1,
                pack_size: 1,
                cost_price_per_pack: 1.0,
                sell_price_per_pack: 1.0,
                batch: None,
                expiry_date: None,
                note: None
            }],
        }));

        // let invoice_line_ids = stock_lines.iter();

        let expected = json!({
            "deleteLocation": {
              "error": {
                "__typename": "LocationInUse",
                "stockLines": {
                  "nodes": [{"id": "stock_line_id"}]
                },
                "invoiceLines": {
                  "nodes": [{"id": "invoice_line_id"}]
                }
              }
            }
          }
        );

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_override),
        )
        .await;
    }

    #[actix_rt::test]
    async fn test_graphql_delete_location_success() {
        let (_, _, settings) = setup_all(
            "test_graphql_delete_location_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteLocationInput!) {
            deleteLocation(input: $input) {
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

        let service_override = service_override!(|_| Ok("deleted".to_owned()));

        let expected = json!({
            "deleteLocation": {
                "id": "deleted",
            }
          }
        );

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_override),
        )
        .await;
    }
}
