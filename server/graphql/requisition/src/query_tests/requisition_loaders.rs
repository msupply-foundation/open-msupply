mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::mock::{
        mock_invoice1_linked_to_requisition, mock_invoice2_linked_to_requisition,
        mock_invoice3_linked_to_requisition, mock_name_a, mock_name_b,
        mock_new_response_requisition_test, mock_request_draft_requisition_all_fields,
        mock_response_draft_requisition_all_fields, MockDataInserts,
    };
    use serde_json::json;

    use crate::RequisitionQueries;

    #[actix_rt::test]
    async fn test_graphql_requisition_loaders() {
        let (_, _, _, settings) = setup_graphl_test(
            RequisitionQueries,
            EmptyMutation,
            "test_graphql_requisition_loaders",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query($storeId: String!, $filter: RequisitionFilterInput) {
          requisitions(filter: $filter, storeId: $storeId) {
            ... on RequisitionConnector {
              nodes {
                id
                otherParty(storeId: $storeId) {
                    id
                }
                linkedRequisition {
                    id
                }
                shipments {
                    nodes {
                        id
                    }
                    totalCount
                }
              }
            }
          }
       }
        "#;

        let request_requisition = mock_request_draft_requisition_all_fields();
        let response_requisition = mock_response_draft_requisition_all_fields();

        let variables = json!({
        "storeId": "store_a",
          "filter": {
            "id": {
                "equalAny": [&request_requisition.requisition.id, &response_requisition.requisition.id]
            },
          }
        }
        );

        // Test otherParty

        let expected = json!({
            "requisitions": {
                "nodes": [{
                    "id": &request_requisition.requisition.id,
                    "otherParty": {
                        "id": mock_name_a().id
                    }
                },
                {
                    "id": &response_requisition.requisition.id,
                    "otherParty": {
                        "id": mock_name_b().id
                    },
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);

        // Test linkedRequisition
        let expected = json!({
            "requisitions": {
                "nodes": [{
                    "id": &request_requisition.requisition.id,
                    "linkedRequisition": {
                        "id": &response_requisition.requisition.id
                    },
                },
                {
                    "id": &response_requisition.requisition.id,
                    "linkedRequisition": {
                        "id": &request_requisition.requisition.id
                    },
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);

        // Test shipments
        let expected = json!({
            "requisitions": {
                "nodes": [{
                    "id": &request_requisition.requisition.id,
                    "shipments": {
                        "nodes": [{
                            "id": mock_invoice1_linked_to_requisition().invoice.id,
                        },
                        {
                            "id": mock_invoice2_linked_to_requisition().invoice.id,
                        }],
                        "totalCount": 2
                    },
                },
                {
                    "id": &response_requisition.requisition.id,
                    "shipments": {
                        "nodes": [{
                            "id": mock_invoice3_linked_to_requisition().invoice.id,
                        }],
                        "totalCount": 1
                    },
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);
    }

    #[actix_rt::test]
    async fn test_graphql_requisition_line() {
        let (_, _, _, settings) = setup_graphl_test(
            RequisitionQueries,
            EmptyMutation,
            "test_graphql_requisition_line",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query($filter: RequisitionFilterInput) {
          requisitions(filter: $filter, storeId: \"store_a\") {
            ... on RequisitionConnector {
              nodes {
                id
                lines {
                    totalCount
                    nodes {
                        id
                        itemId
                        requestedQuantity
                        supplyQuantity
                        suggestedQuantity
                        comment
                        itemStats {
                            averageMonthlyConsumption
                            availableStockOnHand
                            availableMonthsOfStockOnHand
                        }
                    } 
                }
              }
            }
          }
       }
        "#;

        let response_requisition = mock_response_draft_requisition_all_fields();

        let variables = json!({
          "filter": {
                "id": {
                    "equalTo": &response_requisition.requisition.id,
                },
            }
        }
        );

        // Test item

        let expected = json!({
            "requisitions": {
                "nodes": [{
                    "id": &response_requisition.requisition.id,
                    "lines": {
                        "totalCount": 1,
                         "nodes": [{
                            "id": &response_requisition.lines[0].id,
                            "itemId":&response_requisition.lines[0].item_link_id,
                            "requestedQuantity": &response_requisition.lines[0].requested_quantity,
                            "supplyQuantity": &response_requisition.lines[0].supply_quantity,
                            "suggestedQuantity": &response_requisition.lines[0].suggested_quantity,
                            "comment": &response_requisition.lines[0].comment,
                         }]
                    }
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);
    }

    #[actix_rt::test]
    async fn test_graphql_requisition_line_loaders() {
        let (_, _, _, settings) = setup_graphl_test(
            RequisitionQueries,
            EmptyMutation,
            "test_graphql_requisition_line_loaders",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query($filter: RequisitionFilterInput) {
          requisitions(filter: $filter, storeId: \"store_a\") {
            ... on RequisitionConnector {
              nodes {
                id
                lines {
                    nodes {
                        id
                        item {
                            id
                        }
                        linkedRequisitionLine {
                            id
                        }
                    }
                }
              }
            }
          }
       }
        "#;

        let request_requisition = mock_request_draft_requisition_all_fields();
        let response_requisition = mock_response_draft_requisition_all_fields();

        let variables = json!({
          "filter": {
            "id": {
                "equalAny": [&request_requisition.requisition.id, &response_requisition.requisition.id]
            },
          }
        }
        );

        // Test item and linked requisition line

        let expected = json!({
            "requisitions": {
                "nodes": [{
                    "id": &request_requisition.requisition.id,
                    "lines": {
                         "nodes": [{
                             "item": {
                                 "id": request_requisition.lines[0].item_link_id
                             },
                             "linkedRequisitionLine": {
                                "id": response_requisition.lines[0].id,
                             }
                         },{
                            "item": {
                                "id": request_requisition.lines[1].item_link_id
                            },
                            "linkedRequisitionLine": null
                        }]
                    }
                },{
                    "id": &response_requisition.requisition.id,
                    "lines": {
                         "nodes": [{
                             "item": {
                                 "id": response_requisition.lines[0].item_link_id
                             },
                             "linkedRequisitionLine": {
                                "id": request_requisition.lines[0].id,
                            }
                         }]
                    }
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);

        // Test inbound/outbound shipment lines

        let query = r#"
        query($filter: RequisitionFilterInput) {
          requisitions(filter: $filter, storeId: \"store_a\") {
            ... on RequisitionConnector {
              nodes {
                id
                lines {
                    nodes {
                        outboundShipmentLines {
                            nodes {
                                id
                            }
                            totalCount
                        } 
                        inboundShipmentLines {
                            nodes {
                                id
                            }
                            totalCount
                        } 
                    }
                }
              }
            }
          }
       }
        "#;

        let expected = json!({
            "requisitions": {
                "nodes": [{
                    "id": &request_requisition.requisition.id,
                    "lines": {
                         "nodes": [{
                             "outboundShipmentLines": {
                                 "nodes": [{
                                    "id": mock_invoice3_linked_to_requisition().lines[0].line.id,
                                 }],
                             },
                             "inboundShipmentLines": {
                                "nodes": [{
                                   "id": mock_invoice1_linked_to_requisition().lines[0].line.id,
                                }],
                            }
                         },{
                            "outboundShipmentLines": {
                                "totalCount": 0
                            },
                            "inboundShipmentLines": {
                                "totalCount": 2
                            }
                        }]
                    }
                },{
                    "id": &response_requisition.requisition.id,
                    "lines": {
                         "nodes": [{
                            "outboundShipmentLines": {
                                "nodes": [{
                                   "id": mock_invoice3_linked_to_requisition().lines[0].line.id,
                                }],
                            },
                            "inboundShipmentLines": {
                               "nodes": [{
                                  "id": mock_invoice1_linked_to_requisition().lines[0].line.id,
                               }],
                           }
                         }]
                    }
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);

        // Test remaining to supply

        let query = r#"
        query($filter: RequisitionFilterInput) {
          requisitions(filter: $filter, storeId: \"store_a\") {
            ... on RequisitionConnector {
              nodes {
                id
                lines {
                    nodes {
                        id
                        remainingQuantityToSupply
                    }
                }
              }
            }
          }
       }
        "#;

        let variables = json!({
          "filter": {
            "id": {
                "equalAny": [mock_new_response_requisition_test().requisition.id]
            },
          }
        }
        );

        // Used data from create_requisition_shipment_success tests

        let expected = json!({
            "requisitions": {
                "nodes": [{
                    "id": mock_new_response_requisition_test().requisition.id,
                    "lines": {
                         "nodes": [
                            {
                              "id": "mock_new_response_requisition_test1",
                              "remainingQuantityToSupply": 44.0
                            },
                            {
                              "id": "mock_new_response_requisition_test2",
                              "remainingQuantityToSupply": 100.0
                            }
                          ]
                    }
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);
    }
}
