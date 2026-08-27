#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;

    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphql_test;
    use repository::mock::{
        mock_invoice_loader_invoice1, mock_invoice_loader_invoice2,
        mock_invoice_loader_requisition1,
    };

    use repository::mock::MockDataInserts;
    use serde_json::json;

    use crate::InvoiceQueries;

    #[actix_rt::test]
    async fn test_graphql_invoice_loaders() {
        let (_, _, _, settings) = setup_graphql_test(
            InvoiceQueries,
            EmptyMutation,
            "test_graphql_invoice_loaders",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query($filter: InvoiceFilterInput) {
          invoices(filter: $filter, storeId: \"store_a\") {
            ... on InvoiceConnector {
              nodes {
                id
                linkedShipment {
                    id
                }
                requisition {
                    id
                }
              }
            }
          }
       }
        "#;

        let invoice1 = mock_invoice_loader_invoice1();
        let invoice2 = mock_invoice_loader_invoice2();

        let variables = json!({
          "filter": {
            "id": {
                "equalAny": [&invoice1.id, &invoice2.id]
            },
          }
        }
        );

        let expected = json!({
            "invoices": {
                "nodes": [{
                    "id": &invoice1.id,
                    "linkedShipment": null,
                    "requisition": {
                        "id": mock_invoice_loader_requisition1().id
                    }
                },
                {
                    "id": &invoice2.id,
                     "linkedShipment": {
                        "id": &invoice1.id
                    },
                    "requisition": null
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);
    }
}
