#![allow(where_clauses_object_safety)]

mod graphql {
    use crate::graphql::{assert_gql_query, common::get_invoice_lines_inline};
    use chrono::{DateTime, Utc};
    use remote_server::{
        database::{mock::MockDataInserts, repository::InvoiceQueryRepository},
        domain::Pagination,
        util::test_db,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_graphql_invoices_query() {
        let (_, connection, settings) = test_db::setup_all(
            "omsupply-database-gql-invoices-query",
            MockDataInserts::all(),
        )
        .await;

        let invoices = InvoiceQueryRepository::new(&connection)
            .query(Pagination::new(), None, None)
            .unwrap();

        let query = r#"{
            invoices{
                ... on InvoiceConnector {
                    nodes{
                        id
                        pricing {
                            ... on InvoicePricingNode {
                              totalAfterTax
                            }
                        }
                    }
                }
            }
        }"#;

        let expected_json_invoice_nodes = invoices
            .iter()
            .map(|invoice| {
                json!({
                    "id": invoice.id.to_owned(),
                    "pricing": {
                        "totalAfterTax":
                             get_invoice_lines_inline!(&invoice.id, &connection)
                            .iter()
                            .fold(0.0, |acc, invoice_line| acc + invoice_line.total_after_tax),
                    }
                  }
                )
            })
            .collect::<Vec<serde_json::Value>>();
        let expected = json!({
           "invoices": {
               "nodes": expected_json_invoice_nodes,
           }
         }
        );
        assert_gql_query(&settings, query, &None, &expected).await;

        // test time range filter
        let query = r#"query Invoices($filter: [InvoiceFilterInput]) {
                invoices(filter: $filter){
                    ... on InvoiceConnector {
                        nodes {
                            id
                        }
                    }
                }
            }"#;

        let filter_time = invoices.get(1).unwrap().entry_datetime;
        let variables = Some(json!({
          "filter": {
            "entryDatetime": {
                "beforeOrEqualTo": DateTime::<Utc>::from_utc(filter_time, Utc).to_rfc3339()
            },
          }
        }));
        let expected = json!({
            "invoices": {
                "nodes": invoices.iter()
                    .filter(|invoice| invoice.entry_datetime <= filter_time)
                    .map(|invoice| json!({
                        "id": invoice.id,
                    })).collect::<Vec<serde_json::Value>>(),
            },
        });
        assert_gql_query(&settings, &query, &variables, &expected).await;
    }
}
