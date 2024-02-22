#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use chrono::{DateTime, Utc};
    use graphql_core::test_helpers::setup_graphl_test;
    use graphql_core::{assert_graphql_query, get_invoice_lines_inline};
    use repository::EqualFilter;
    use repository::{mock::MockDataInserts, InvoiceFilter, InvoiceRepository};
    use serde_json::json;

    use crate::InvoiceQueries;

    #[actix_rt::test]
    async fn test_graphql_invoices_query_pricing() {
        let (_, connection, _, settings) = setup_graphl_test(
            InvoiceQueries,
            EmptyMutation,
            "test_graphql_invoices_query_pricing",
            MockDataInserts::all(),
        )
        .await;

        let invoices = InvoiceRepository::new(&connection)
            .query_by_filter(InvoiceFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        let query = r#"{
            invoices(storeId: \"store_a\"){
                ... on InvoiceConnector {
                    nodes{
                        id
                        pricing {
                            ... on PricingNode {
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
                    "id": invoice.invoice_row.id.to_owned(),
                    "pricing": {
                        "totalAfterTax":
                             get_invoice_lines_inline!(&invoice.invoice_row.id, &connection)
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
        assert_graphql_query!(&settings, query, &None, &expected, None);
    }

    #[actix_rt::test]
    async fn test_graphql_invoices_query_filters() {
        let (_, connection, _, settings) = setup_graphl_test(
            InvoiceQueries,
            EmptyMutation,
            "test_graphql_invoices_query_filters",
            MockDataInserts::all(),
        )
        .await;

        let invoices = InvoiceRepository::new(&connection)
            .query_by_filter(InvoiceFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        // filter query
        let query = r#"query Invoices($filter: [InvoiceFilterInput]) {
            invoices(filter: $filter, storeId: \"store_a\"){
                ... on InvoiceConnector {
                    nodes {
                        id
                    }
                }
            }
        }"#;

        // test time range filter
        let filter_time = invoices.get(1).unwrap().invoice_row.created_datetime;
        let variables = Some(json!({
          "filter": {
            "createdDatetime": {
                "beforeOrEqualTo": DateTime::<Utc>::from_naive_utc_and_offset(filter_time, Utc).to_rfc3339()
            },
          }
        }));
        let expected = json!({
            "invoices": {
                "nodes": invoices.iter()
                    .filter(|invoice| invoice.invoice_row.created_datetime <= filter_time)
                    .map(|invoice| json!({
                        "id": invoice.invoice_row.id,
                    })).collect::<Vec<serde_json::Value>>(),
            },
        });
        assert_graphql_query!(&settings, &query, &variables, &expected, None);

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
                    .filter(|invoice| invoice.invoice_row.invoice_number == 3)
                    .map(|invoice| json!({
                        "id": invoice.invoice_row.id,
                    })).collect::<Vec<serde_json::Value>>(),
            },
        });
        assert_graphql_query!(&settings, &query, &variables, &expected, None);
    }

    macro_rules! sort_test {
        ($key:expr, $field:ident, $gql_field:expr, $invoices:expr, $desc:expr, $to_lowercase:expr) => {{
            let query = r#"query Invoices($sort: [InvoiceSortInput]) {
                invoices(sort: $sort, storeId: \"store_a\"){
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
                $invoices.sort_by(|b, a| {
                    if $to_lowercase {
                        let a = &format!("{}", a.invoice_row.$field).to_lowercase();
                        let b = &format!("{}", b.invoice_row.$field).to_lowercase();
                        a.cmp(b)
                    } else {
                        a.invoice_row.$field.cmp(&b.invoice_row.$field)
                    }
                });
              } else {
                $invoices.sort_by(|a, b| {
                    if $to_lowercase {
                        let a = &format!("{}", a.invoice_row.$field).to_lowercase();
                        let b = &format!("{}", b.invoice_row.$field).to_lowercase();
                        a.cmp(b)
                    } else {
                        a.invoice_row.$field.cmp(&b.invoice_row.$field)
                    }
                });
              }

              let expected = json!({
                "invoices": {
                    "nodes": $invoices.iter()
                        .map(|invoice| json!({
                            $gql_field: invoice.invoice_row.$field,
                        })).collect::<Vec<serde_json::Value>>(),
                },
            });

              (query, variables, expected)
        }};
    }

    #[actix_rt::test]
    async fn test_graphql_invoices_query_sort() {
        let (_, connection, _, settings) = setup_graphl_test(
            InvoiceQueries,
            EmptyMutation,
            "test_graphql_invoices_query_sort",
            MockDataInserts::all(),
        )
        .await;

        let mut invoices = InvoiceRepository::new(&connection)
            .query_by_filter(InvoiceFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        // invoice number
        let (query, variables, expected) = sort_test!(
            "invoiceNumber",
            invoice_number,
            "invoiceNumber",
            invoices,
            true,
            false
        );
        assert_graphql_query!(&settings, &query, &variables, &expected, None);
        let (query, variables, expected) = sort_test!(
            "invoiceNumber",
            invoice_number,
            "invoiceNumber",
            invoices,
            false,
            false
        );
        assert_graphql_query!(&settings, &query, &variables, &expected, None);
        // other party name

        // TODO this is too hacky
        struct TempStruct {
            invoice_row: TempInnerStruct,
        }
        struct TempInnerStruct {
            field: String,
        }

        let mut other_party_names: Vec<TempStruct> = invoices
            .into_iter()
            .map(|invoice| TempStruct {
                invoice_row: TempInnerStruct {
                    field: invoice.other_party_name().to_string(),
                },
            })
            .collect();

        let (query, variables, expected) = sort_test!(
            "otherPartyName",
            field,
            "otherPartyName",
            other_party_names,
            true,
            true
        );
        assert_graphql_query!(&settings, &query, &variables, &expected, None);
        let (query, variables, expected) = sort_test!(
            "otherPartyName",
            field,
            "otherPartyName",
            other_party_names,
            false,
            true
        );
        assert_graphql_query!(&settings, &query, &variables, &expected, None);
    }
}
