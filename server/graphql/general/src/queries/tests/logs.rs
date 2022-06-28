mod graphql {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;

    use crate::GeneralQueries;

    #[actix_rt::test]
    async fn test_graphql_logs_query() {
        let (_, _, _, settings) = setup_graphl_test(
            GeneralQueries,
            EmptyMutation,
            "test_logs_query",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query logs {
            logs {
                ... on LogConnector {
                    nodes {
                        datetime
                        id
                        logType
                        recordId
                        storeId
                    }
                }
            }
        }"#;

        let expected = json!({
            "logs": {
                "nodes": [
                    {
                        "datetime": "2020-01-01T00:00:00",
                        "id": "log_a",
                        "logType": "USER_LOGGED_IN",
                        "recordId": null,
                        "storeId": null,
                    },
                    {
                        "datetime": "2020-01-01T00:00:00",
                        "id": "log_b",
                        "logType": "INVOICE_CREATED",
                        "recordId": "outbound_shipment_a",
                        "storeId": "store_a",
                    },
                    {
                        "datetime": "2020-01-01T00:00:00",
                        "id": "log_c",
                        "logType": "INVOICE_STATUS_ALLOCATED",
                        "recordId": "inbound_shipment_a",
                        "storeId": "store_b",
                    },
                ]
            }
        });

        assert_graphql_query!(&settings, query, &None, Some(&expected), None);
    }

    #[actix_rt::test]
    async fn test_graphql_logs_query_loaders() {
        let (_, _, _, settings) = setup_graphl_test(
            GeneralQueries,
            EmptyMutation,
            "test_logs_query_loaders",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query logs($logFilter: LogFilterInput!) {
            logs(filter: $logFilter) {
                ... on LogConnector {
                    nodes {
                        datetime
                        id
                        logType
                        recordId
                        store {
                            id
                        }
                        storeId
                        user {
                            userId
                        }
                    }
                }
            }
        }"#;

        let variables = json!({
            "logFilter": {
                "logType": {
                    "equalTo": "INVOICE_CREATED"
                }
            }
        });

        let expected = json!({
            "logs": {
                "nodes": [
                    {
                        "id": "log_b",
                        "logType": "INVOICE_CREATED",
                        "recordId": "outbound_shipment_a",
                        "datetime": "2020-01-01T00:00:00",
                        "store": {
                            "id": "store_a"
                        },
                        "storeId": "store_a",
                        "user": {
                            "userId": "user_account_a"
                        }
                    }
                ]
            }
        });
        assert_graphql_query!(&settings, query, &Some(variables), &expected, None);
    }
}
