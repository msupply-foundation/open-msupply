mod graphql {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;

    use crate::GeneralQueries;

    #[actix_rt::test]
    async fn test_graphql_activity_logs_query() {
        let (_, _, _, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_activity_logs_query",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query activityLogs {
            activityLogs {
                ... on ActivityLogConnector {
                    nodes {
                        datetime
                        id
                        type
                        recordId
                        storeId
                    }
                }
            }
        }"#;

        let expected = json!({
            "activityLogs": {
                "nodes": [
                    {
                        "datetime": "2020-01-01T00:00:00+00:00",
                        "id": "log_a",
                        "type": "USER_LOGGED_IN",
                        "recordId": null,
                        "storeId": null,
                    },
                    {
                        "datetime": "2020-01-01T00:00:00+00:00",
                        "id": "log_b",
                        "type": "INVOICE_CREATED",
                        "recordId": "outbound_shipment_a",
                        "storeId": "store_b",
                    },
                    {
                        "datetime": "2020-01-01T00:00:00+00:00",
                        "id": "log_c",
                        "type": "INVOICE_STATUS_ALLOCATED",
                        "recordId": "inbound_shipment_a",
                        "storeId": "store_b",
                    },
                ]
            }
        });

        assert_graphql_query!(&settings, query, &None, Some(&expected), None);
    }

    #[actix_rt::test]
    async fn test_graphql_activity_logs_query_loaders() {
        let (_, _, _, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_activity_logs_query_loaders",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query activityLogs($activityLogFilter: ActivityLogFilterInput!) {
            activityLogs(filter: $activityLogFilter) {
                ... on ActivityLogConnector {
                    nodes {
                        datetime
                        id
                        type
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
            "activityLogFilter": {
                "type": {
                    "equalTo": "INVOICE_CREATED"
                }
            }
        });

        let expected = json!({
            "activityLogs": {
                "nodes": [
                    {
                        "id": "log_b",
                        "type": "INVOICE_CREATED",
                        "recordId": "outbound_shipment_a",
                        "datetime": "2020-01-01T00:00:00+00:00",
                        "store": {
                            "id": "store_b"
                        },
                        "storeId": "store_b",
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
