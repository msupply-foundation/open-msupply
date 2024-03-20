#[cfg(test)]
mod permission_tests {
    use std::sync::{Arc, Mutex};

    use async_graphql::MergedObject;
    use graphql_cold_chain::{ColdChainMutations, ColdChainQueries};
    use graphql_core::test_helpers::setup_graphql_test;
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use service::{
        auth::{AuthError, AuthServiceTrait, Resource, ResourceAccessRequest, ValidatedUser},
        auth_data::AuthData,
        service_provider::{ServiceContext, ServiceProvider},
    };

    use graphql_batch_mutations::BatchMutations;
    use graphql_general::{GeneralMutations, GeneralQueries};
    use graphql_invoice::{InvoiceMutations, InvoiceQueries};
    use graphql_invoice_line::InvoiceLineMutations;
    use graphql_location::{LocationMutations, LocationQueries};
    use graphql_pack_variant::PackVariantQueries;
    use graphql_reports::ReportQueries;
    use graphql_requisition::{RequisitionMutations, RequisitionQueries};
    use graphql_requisition_line::RequisitionLineMutations;
    use graphql_stocktake::{StocktakeMutations, StocktakeQueries};
    use graphql_stocktake_line::StocktakeLineMutations;
    //use graphql_temperature_breach::TemperatureBreachQueries;
    //use graphql_temperature_log::TemperatureLogQueries;

    // TODO for some reason Rust complained when using the Full{Query|Mutation} definition from
    // lib.rs. As a workaround these defs are copied here. Hopefully this should be possible but I
    // gave up on this for now.
    #[derive(MergedObject, Default, Clone)]
    pub struct FullQuery(
        pub InvoiceQueries,
        pub LocationQueries,
        pub ColdChainQueries,
        pub StocktakeQueries,
        pub GeneralQueries,
        pub RequisitionQueries,
        pub ReportQueries,
        pub PackVariantQueries,
    );

    #[derive(MergedObject, Default, Clone)]
    pub struct FullMutation(
        pub InvoiceMutations,
        pub InvoiceLineMutations,
        pub LocationMutations,
        pub ColdChainMutations,
        pub StocktakeMutations,
        pub StocktakeLineMutations,
        pub BatchMutations,
        pub RequisitionMutations,
        pub RequisitionLineMutations,
        pub GeneralMutations,
    );

    pub fn full_query() -> FullQuery {
        FullQuery(
            InvoiceQueries,
            LocationQueries,
            ColdChainQueries,
            StocktakeQueries,
            GeneralQueries,
            RequisitionQueries,
            ReportQueries,
            PackVariantQueries,
        )
    }

    pub fn full_mutation() -> FullMutation {
        FullMutation(
            InvoiceMutations,
            InvoiceLineMutations,
            LocationMutations,
            ColdChainMutations,
            StocktakeMutations,
            StocktakeLineMutations,
            BatchMutations,
            RequisitionMutations,
            RequisitionLineMutations,
            GeneralMutations,
        )
    }

    #[derive(Clone)]
    pub struct TestService {
        expected: ResourceAccessRequest,
        actual: Arc<Mutex<Option<ResourceAccessRequest>>>,
    }

    struct TestData {
        name: &'static str,
        query: &'static str,
        expected: ResourceAccessRequest,
    }

    fn resource_mapping_query_test_data() -> Vec<TestData> {
        vec![
            TestData {
                name: "invoice",
                query: r#"query Query {
                  invoice(id: "", storeId: "") {
                    ... on InvoiceNode {
                      id
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryInvoice,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "invoiceByNumber",
                query: r#"query Query {
                  invoiceByNumber(invoiceNumber: 10, storeId: "", type: OUTBOUND_SHIPMENT) {
                    ... on InvoiceNode {
                      id
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryInvoice,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "invoiceCounts",
                query: r#"query Query {
                invoiceCounts(storeId: "") {
                  outbound {
                    notShipped
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::InvoiceCount,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "invoices",
                query: r#"query Query {
                invoices(storeId: "") {
                  ... on InvoiceConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryInvoice,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "items",
                query: r#"query Query {
                items(storeId: "") {
                  ... on ItemConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryItems,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "locations",
                query: r#"query Query {
                locations(storeId: "") {
                  ... on LocationConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryLocation,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "sensors",
                query: r#"query Query {
              sensors(storeId: "") {
                ... on SensorConnector {
                  nodes {
                    id
                  }
                }
              }
            }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QuerySensor,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "masterLists",
                query: r#"query Query {
                masterLists(storeId: "") {
                  ... on MasterListConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryMasterList,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "names",
                query: r#"query Query {
                names(storeId: "") {
                  ... on NameConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryName,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "printReport",
                query: r#"query Query {
                printReport(dataId: "", reportId: "", storeId: "") {
                  ... on PrintReportNode {
                    __typename
                    fileId
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::Report,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "reports",
                query: r#"query Query {
                reports(storeId: "") {
                  ... on ReportConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::Report,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "syncSettings",
                query: r#"query Query {
                  syncSettings { 
                    __typename
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::ServerAdmin,
                    store_id: None,
                },
            },
            TestData {
                name: "requisition",
                query: r#"query Query {
                requisition(id: "", storeId: "") {
                  ... on RequisitionNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "requisitionByNumber",
                query: r#"query Query {
                requisitionByNumber(requisitionNumber: 10, storeId: "", type: REQUEST) {
                  ... on RequisitionNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "requisitionLineChart",
                query: r#"query Query {
                requisitionLineChart(requestRequisitionLineId: "", storeId: "") {
                  ... on ItemChartNode {
                    calculationDate
                    consumptionHistory {
                      totalCount
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::RequisitionChart,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "requisitions",
                query: r#"query Query {
                  requisitions(storeId: "") {
                    ... on RequisitionConnector {
                      nodes {
                        id
                      }
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "stockCounts",
                query: r#"query Query {
                stockCounts(storeId: "") {
                  expiringSoon
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::StockCount,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "stocktake",
                query: r#"query Query {
                stocktake(id: "", storeId: "") {
                  ... on StocktakeNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "stocktakeByNumber",
                query: r#"query Query {
                stocktakeByNumber(stocktakeNumber: 10, storeId: "") {
                  ... on StocktakeNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "stocktakes",
                query: r#"query Query {
                stocktakes(storeId: "") {
                  ... on StocktakeConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "stores",
                query: r#"query Query {
                stores {
                  ... on StoreConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryStore,
                    store_id: None,
                },
            },
            TestData {
                name: "stores",
                query: r#"query Query {
              stores {
                ... on StoreConnector {
                  nodes {
                    id
                  }
                }
              }
            }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::QueryStore,
                    store_id: None,
                },
            },
        ]
    }

    fn resource_mapping_mutation_test_data() -> Vec<TestData> {
        vec![
            TestData {
                name: "addFromMasterList",
                query: r#"mutation Mutation {
                  addFromMasterList(input: {requestRequisitionId: "", masterListId: ""}, storeId: "") {
                    ... on RequisitionLineConnector {
                      nodes {
                        id
                      }
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "allocateOutboundShipmentUnallocatedLine",
                query: r#"mutation Mutation {
                  allocateOutboundShipmentUnallocatedLine(lineId: "", storeId: "") {
                    ... on AllocateOutboundShipmentUnallocatedLineError {
                      __typename
                      error {
                        description
                      }
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "batchInboundShipment",
                query: r#"mutation Mutation {
                batchInboundShipment(storeId: "", input: {}) {
                  updateInboundShipments {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "batchOutboundShipment",
                query: r#"mutation Mutation {
                  batchOutboundShipment(input: {}, storeId: "") {
                    updateOutboundShipments {
                      id
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "batchRequestRequisition",
                query: r#"mutation Mutation {
                  batchRequestRequisition(input: {}, storeId: "") {
                    updateRequestRequisitions {
                      id
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "batchStocktake",
                query: r#"mutation Mutation {
                  batchStocktake(input: {}, storeId: "") {
                    updateStocktakes {
                      id
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "createRequisitionShipment",
                query: r#"mutation Mutation {
                createRequisitionShipment(input: {responseRequisitionId: ""}, storeId: "") {
                  ... on InvoiceNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteInboundShipment",
                query: r#"mutation Mutation {
                deleteInboundShipment(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteInboundShipmentLine",
                query: r#"mutation Mutation {
                deleteInboundShipmentLine(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteInboundShipmentServiceLine",
                query: r#"mutation Mutation {
                deleteInboundShipmentServiceLine(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteInboundShipmentServiceLine",
                query: r#"mutation Mutation {
                deleteLocation(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateLocation,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteOutboundShipment",
                query: r#"mutation Mutation {
                deleteOutboundShipment(id: "", storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteOutboundShipmentLine",
                query: r#"mutation Mutation {
                deleteOutboundShipmentLine(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteOutboundShipmentServiceLine",
                query: r#"mutation Mutation {
                  deleteOutboundShipmentServiceLine(input: {id: ""}, storeId: "") {
                    ... on DeleteResponse {
                      id
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteOutboundShipmentUnallocatedLine",
                query: r#"mutation Mutation {
                deleteOutboundShipmentUnallocatedLine(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteRequestRequisition",
                query: r#"mutation Mutation {
                deleteRequestRequisition(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteRequestRequisitionLine",
                query: r#"mutation Mutation {
                deleteRequestRequisitionLine(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteStocktake",
                query: r#"mutation Mutation {
                deleteStocktake(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "deleteStocktakeLine",
                query: r#"mutation Mutation {
                deleteStocktakeLine(input: {id: ""}, storeId: "") {
                  ... on DeleteResponse {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertInboundShipment",
                query: r#"mutation Mutation {
                insertInboundShipment(input: {id: "", otherPartyId: ""}, storeId: "") {
                  ... on InvoiceNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertInboundShipmentLine",
                query: r#"mutation Mutation {
                insertInboundShipmentLine(input: {id: "", invoiceId: "", itemId: "", packSize: 10, costPricePerPack: 1.5, sellPricePerPack: 1.5, numberOfPacks: 10, totalBeforeTax: 1.5}, storeId: "") {
                  ... on InvoiceLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertInboundShipmentServiceLine",
                query: r#"mutation Mutation {
                insertInboundShipmentServiceLine(input: {id: "", invoiceId: "", totalBeforeTax: 1.5}, storeId: "") {
                  ... on InvoiceLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertLocation",
                query: r#"mutation Mutation {
                insertLocation(input: {id: "", code: ""}, storeId: "") {
                  ... on LocationNode {
                    id
                    name
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateLocation,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertOutboundShipment",
                query: r#"mutation Mutation {
                insertOutboundShipment(input: {id: "", otherPartyId: ""}, storeId: "") {
                  ... on InvoiceNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertOutboundShipmentLine",
                query: r#"mutation Mutation {
                insertOutboundShipmentLine(input: {id: "", invoiceId: "", itemId: "", stockLineId: "", numberOfPacks: 10, totalBeforeTax: 1.5}, storeId: "") {
                  ... on InvoiceLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertOutboundShipmentServiceLine",
                query: r#"mutation Mutation {
              insertOutboundShipmentServiceLine(input: {id: "", invoiceId: "", totalBeforeTax: 1.5}, storeId: "") {
                ... on InvoiceLineNode {
                  id
                }
              }
            }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertOutboundShipmentUnallocatedLine",
                query: r#"mutation Mutation {
                insertOutboundShipmentUnallocatedLine(input: {id: "", invoiceId: "", itemId: "", quantity: 10}, storeId: "") {
                  ... on InvoiceLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertRequestRequisition",
                query: r#"mutation Mutation {
                insertRequestRequisition(input: {id: "", otherPartyId: "", maxMonthsOfStock: 1.5, minMonthsOfStock: 1.5}, storeId: "") {
                  ... on RequisitionNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertRequestRequisitionLine",
                query: r#"mutation Mutation {
                insertRequestRequisitionLine(input: {id: "", itemId: "", requisitionId: ""}, storeId: "") {
                  ... on RequisitionLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertStocktake",
                query: r#"mutation Mutation {
                insertStocktake(input: {id: ""}, storeId: "") {
                  ... on StocktakeNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "insertStocktakeLine",
                query: r#"mutation Mutation {
                insertStocktakeLine(input: {id: "", stocktakeId: ""}, storeId: "") {
                  ... on StocktakeLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "supplyRequestedQuantity",
                query: r#"mutation Mutation {
                supplyRequestedQuantity(input: {responseRequisitionId: ""}, storeId: "") {
                  ... on RequisitionLineConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateInboundShipment",
                query: r#"mutation Mutation {
                updateInboundShipment(input: {id: ""}, storeId: "") {
                  ... on InvoiceNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateInboundShipment",
                query: r#"mutation Mutation {
                updateInboundShipmentLine(input: {id: ""}, storeId: "") {
                  ... on InvoiceLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateInboundShipmentServiceLine",
                query: r#"mutation Mutation {
                updateInboundShipmentServiceLine(input: {id: ""}, storeId: "") {
                  ... on InvoiceLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateInboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateLocation",
                query: r#"mutation Mutation {
                updateLocation(input: {id: ""}, storeId: "") {
                  ... on LocationNode {
                    id
                    name
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateLocation,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateSensor",
                query: r#"mutation Mutation {
              updateSensor(input: {id: ""}, storeId: "") {
                ... on SensorNode {
                  id
                  name
                }
              }
            }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateSensor,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateOutboundShipment",
                query: r#"mutation Mutation {
                updateOutboundShipment(input: {id: ""}, storeId: "") {
                  ... on InvoiceNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateOutboundShipmentLine",
                query: r#"mutation Mutation {
                updateOutboundShipmentLine(input: {id: ""}, storeId: "") {
                  ... on InvoiceLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateOutboundShipmentServiceLine",
                query: r#"mutation Mutation {
                updateOutboundShipmentServiceLine(input: {id: ""}, storeId: "") {
                  ... on InvoiceLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateOutboundShipmentUnallocatedLine",
                query: r#"mutation Mutation {
                updateOutboundShipmentUnallocatedLine(input: {id: "", quantity: 10}, storeId: "") {
                  ... on InvoiceLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateOutboundShipment,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateRequestRequisition",
                query: r#"mutation Mutation {
                  updateRequestRequisition(input: {id: ""}, storeId: "") {
                    ... on RequisitionNode {
                      id
                    }
                  }
                }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateRequestRequisitionLine",
                query: r#"mutation Mutation {
                updateRequestRequisitionLine(input: {id: ""}, storeId: "") {
                  ... on RequisitionLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateResponseRequisition",
                query: r#"mutation Mutation {
                updateResponseRequisition(input: {id: ""}, storeId: "") {
                  ... on RequisitionNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateResponseRequisitionLine",
                query: r#"mutation Mutation {
                updateResponseRequisitionLine(input: {id: ""}, storeId: "") {
                  ... on RequisitionLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateSyncSettings",
                query: r#"mutation Mutation {
                  updateSyncSettings(input: {url: "test", username: "user", password: "", intervalSeconds: 10}) {
                    __typename
                }
            }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::ServerAdmin,
                    store_id: None,
                },
            },
            TestData {
                name: "updateStocktake",
                query: r#"mutation Mutation {
                updateStocktake(input: {id: ""}, storeId: "") {
                  ... on StocktakeNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateStocktakeLine",
                query: r#"mutation Mutation {
                updateStocktakeLine(input: {id: ""}, storeId: "") {
                  ... on StocktakeLineNode {
                    id
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateStocktake,
                    store_id: Some("some".to_string()),
                },
            },
            TestData {
                name: "updateStocktakeLine",
                query: r#"mutation Mutation {
                useSuggestedQuantity(input: {requestRequisitionId: ""}, storeId: "") {
                  ... on RequisitionLineConnector {
                    nodes {
                      id
                    }
                  }
                }
              }"#,
                expected: ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some("some".to_string()),
                },
            },
        ]
    }
    impl TestService {
        fn new(expected: ResourceAccessRequest) -> Self {
            TestService {
                expected,
                actual: Arc::new(Mutex::new(None)),
            }
        }

        /// Test if service has been called with the expecting parameters
        fn error(&self) -> Option<String> {
            let actual = self.actual.lock().unwrap();
            match actual.as_ref() {
                Some(actual) => {
                    if self.expected.resource != actual.resource
                        || self.expected.store_id.is_some() != actual.store_id.is_some()
                    {
                        Some(format!(
                            "Expected: resource == {:?} && store_id.is_some() == {}; Actual: resource == {:?} && store_id.is_some() == {}",
                            &self.expected.resource, self.expected.store_id.is_some(), actual.resource, actual.store_id.is_some()
                        ))
                    } else {
                        None
                    }
                }
                None => Some("Validation service hasn't been called".to_string()),
            }
        }
    }

    impl AuthServiceTrait for TestService {
        fn validate(
            &self,
            _: &ServiceContext,
            _: &AuthData,
            _: &Option<String>,
            resource_request: &ResourceAccessRequest,
        ) -> Result<ValidatedUser, AuthError> {
            let mut actual = self.actual.lock().unwrap();
            *actual = Some(resource_request.clone());
            // we collected the info we needed just abort the request:
            return Err(AuthError::InternalError(
                "Just abort the request".to_string(),
            ));
        }
    }

    fn service_provider(
        test_service: &TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.validation_service = Box::new(test_service.clone());
        service_provider
    }

    /// Test that all endpoints use the correct resource validation
    #[actix_rt::test]
    async fn test_graphql_permissions_resource_mapping() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            full_query(),
            full_mutation(),
            "test_graphql_permissions_resource_mapping",
            MockDataInserts::none(),
        )
        .await;

        for data in resource_mapping_mutation_test_data()
            .into_iter()
            .chain(resource_mapping_query_test_data().into_iter())
        {
            let test_service = TestService::new(data.expected);
            let _ = graphql_core::test_helpers::run_test_gql_query(
                &settings,
                // escape query quotes
                &data.query.replace("\"", "\\\""),
                &None,
                Some(service_provider(&test_service, &connection_manager)),
            )
            .await;

            assert_eq!(
                None,
                test_service.error(),
                "Permission error in: {}",
                data.name
            );
        }
    }
}
