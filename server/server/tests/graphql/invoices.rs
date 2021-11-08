#![allow(where_clauses_object_safety)]

mod graphql {
    use crate::graphql::{assert_gql_query, common::get_invoice_lines_inline};
    use chrono::{DateTime, Utc};
    use domain::Pagination;
    use remote_server::{
        database::{mock::MockDataInserts, repository::InvoiceQueryRepository},
        util::test_db,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_graphql_invoices_query_pricing() {
        let (_, connection, settings) = test_db::setup_all(
            "omsupply-database-gql-invoices-query-pricing",
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
    }

    #[actix_rt::test]
    async fn test_graphql_invoices_query_filters() {
        let (_, connection, settings) = test_db::setup_all(
            "omsupply-database-gql-invoices-query-filters",
            MockDataInserts::all(),
        )
        .await;

        let invoices = InvoiceQueryRepository::new(&connection)
            .query(Pagination::new(), None, None)
            .unwrap();

        // filter query
        let query = r#"query Invoices($filter: [InvoiceFilterInput]) {
            invoices(filter: $filter){
                ... on InvoiceConnector {
                    nodes {
                        id
                    }
                }
            }
        }"#;

        // test time range filter
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

        // test invoice number filter
        let variables = Some(json!({
          "filter": {
            "invoiceNumber": {
                "equalTo": 3
            },
          }
        }));
        let expected = json!({
            "invoices": {
                "nodes": invoices.iter()
                    .filter(|invoice| invoice.invoice_number == 3)
                    .map(|invoice| json!({
                        "id": invoice.id,
                    })).collect::<Vec<serde_json::Value>>(),
            },
        });
        assert_gql_query(&settings, &query, &variables, &expected).await;
    }

    macro_rules! sort_test {
        ($key:expr, $field:ident, $gql_field:expr, $invoices:expr, $desc:expr) => {{
            let query = r#"query Invoices($sort: [InvoiceSortInput]) {
                invoices(sort: $sort){
                    ... on InvoiceConnector {
                        nodes {
                            $gql_field 
                        }
                    }
                }
            }"#.replace("$gql_field", $gql_field);

            let variables = Some(json!({
                "sort": [{
                  "key": $key,
                  "desc": $desc,
                }]
              }));

              if $desc {
                $invoices.sort_by(|b, a| a.$field.cmp(&b.$field));
              } else {
                $invoices.sort_by(|a, b| a.$field.cmp(&b.$field));
              }

              let expected = json!({
                "invoices": {
                    "nodes": $invoices.iter()
                        .map(|invoice| json!({
                            $gql_field: invoice.$field,
                        })).collect::<Vec<serde_json::Value>>(),
                },
            });

              (query, variables, expected)
        }};
    }

    #[actix_rt::test]
    async fn test_graphql_invoices_query_sort() {
        let (_, connection, settings) = test_db::setup_all(
            "omsupply-database-gql-invoices-query-sort",
            MockDataInserts::all(),
        )
        .await;

        let mut invoices = InvoiceQueryRepository::new(&connection)
            .query(Pagination::new(), None, None)
            .unwrap();
        // invoice number
        let (query, variables, expected) = sort_test!(
            "invoiceNumber",
            invoice_number,
            "invoiceNumber",
            invoices,
            true
        );
        assert_gql_query(&settings, &query, &variables, &expected).await;
        let (query, variables, expected) = sort_test!(
            "invoiceNumber",
            invoice_number,
            "invoiceNumber",
            invoices,
            false
        );
        assert_gql_query(&settings, &query, &variables, &expected).await;
        // other party name
        let (query, variables, expected) = sort_test!(
            "otherPartyName",
            other_party_name,
            "otherPartyName",
            invoices,
            true
        );
        assert_gql_query(&settings, &query, &variables, &expected).await;
        let (query, variables, expected) = sort_test!(
            "otherPartyName",
            other_party_name,
            "otherPartyName",
            invoices,
            false
        );
        assert_gql_query(&settings, &query, &variables, &expected).await;
    }
}
