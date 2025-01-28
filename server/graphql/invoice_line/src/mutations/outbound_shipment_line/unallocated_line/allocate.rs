use async_graphql::*;
use graphql_core::{
    simple_generic_errors::RecordNotFound, standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError, ContextExt,
};
use graphql_types::types::{DeleteResponse, InvoiceLineConnector, StockLineConnector};
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice_line::outbound_shipment_unallocated_line::{
        AllocateLineResult as ServiceResult,
        AllocateOutboundShipmentUnallocatedLineError as ServiceError,
    },
};

#[derive(Interface)]
#[graphql(name = "AllocateOutboundShipmentUnallocatedLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum AllocateErrorInterface {
    RecordNotFound(RecordNotFound),
}

#[derive(SimpleObject)]
#[graphql(name = "AllocateOutboundShipmentUnallocatedLineError")]
pub struct AllocateError {
    pub error: AllocateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "AllocateOutboundShipmentUnallocatedLineResponse")]
pub enum AllocateResponse {
    Error(AllocateError),
    Response(ResponseNode),
}
#[derive(SimpleObject)]
#[graphql(name = "AllocateOutboundShipmentUnallocatedLineNode")]
pub struct ResponseNode {
    updates: InvoiceLineConnector,
    inserts: InvoiceLineConnector,
    deletes: Vec<DeleteResponse>,
    skipped_expired_stock_lines: StockLineConnector,
    skipped_on_hold_stock_lines: StockLineConnector,
    issued_expiring_soon_stock_lines: StockLineConnector,
}

pub fn allocate(ctx: &Context<'_>, store_id: &str, line_id: String) -> Result<AllocateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_line_service
            .allocate_outbound_shipment_unallocated_line(&service_context, line_id),
    )
}

pub fn map_response(from: Result<ServiceResult, ServiceError>) -> Result<AllocateResponse> {
    let result = match from {
        Ok(line) => AllocateResponse::Response(ResponseNode::from_domain(line)),
        Err(error) => AllocateResponse::Error(AllocateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<AllocateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(AllocateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        // Standard Graphql Errors
        ServiceError::LineIsNotUnallocatedLine => BadUserInput(formatted_error),
        ServiceError::InsertOutboundShipmentLine(_) => InternalError(formatted_error),
        ServiceError::UpdateOutboundShipmentLine(_) => InternalError(formatted_error),
        ServiceError::DeleteOutboundShipmentUnallocatedLine(_) => InternalError(formatted_error),
        ServiceError::UpdateOutboundShipmentUnallocatedLine(_) => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl ResponseNode {
    pub fn from_domain(from: ServiceResult) -> ResponseNode {
        let ServiceResult {
            updates,
            deletes,
            inserts,
            skipped_expired_stock_lines,
            skipped_on_hold_stock_lines,
            issued_expiring_soon_stock_lines,
        } = from;
        ResponseNode {
            updates: InvoiceLineConnector::from_vec(updates),
            deletes: deletes.into_iter().map(DeleteResponse).collect(),
            inserts: InvoiceLineConnector::from_vec(inserts),
            skipped_expired_stock_lines: StockLineConnector::from_vec(skipped_expired_stock_lines),
            skipped_on_hold_stock_lines: StockLineConnector::from_vec(skipped_on_hold_stock_lines),
            issued_expiring_soon_stock_lines: StockLineConnector::from_vec(
                issued_expiring_soon_stock_lines,
            ),
        }
    }
}

#[cfg(test)]
mod graphql {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::MockDataInserts, InvoiceLine, InvoiceLineRow, StockLine, StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        invoice_line::{
            outbound_shipment_unallocated_line::{
                AllocateLineResult as ServiceResult,
                AllocateOutboundShipmentUnallocatedLineError as ServiceError,
            },
            InvoiceLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };
    use util::inline_init;

    use crate::InvoiceLineMutations;

    type AllocateLineMethod = dyn Fn(String) -> Result<ServiceResult, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<AllocateLineMethod>);

    impl InvoiceLineServiceTrait for TestService {
        fn allocate_outbound_shipment_unallocated_line(
            &self,
            _: &ServiceContext,
            input: String,
        ) -> Result<ServiceResult, ServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.invoice_line_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "lineId": "unallocated_line"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_allocate_unallocated_structured_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_allocate_unallocated_line_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($lineId: String!) {
            allocateOutboundShipmentUnallocatedLine(lineId: $lineId, storeId: \"store_a\") {
              ... on AllocateOutboundShipmentUnallocatedLineError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RecordNotFound
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineDoesNotExist)));

        let expected = json!({
            "allocateOutboundShipmentUnallocatedLine": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_allocate_unallocated_standard_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_allocate_unallocated_line_standard_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($lineId: String!) {
            allocateOutboundShipmentUnallocatedLine(lineId: $lineId, storeId: \"store_a\") {
                __typename
            }
          }
        "#;

        // LineIsNotUnallocatedLine
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineIsNotUnallocatedLine)));
        let expected_message = "Bad user input";
        let expected_extensions =
            json!({ "details": format!("{:#?}", ServiceError::LineIsNotUnallocatedLine) });
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            Some(expected_extensions),
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_allocate_unallocated_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_allocate_unallocated_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($lineId: String!) {
            allocateOutboundShipmentUnallocatedLine(lineId: $lineId, storeId: \"store_a\") {
                ... on AllocateOutboundShipmentUnallocatedLineNode {
                    inserts {
                        nodes {
                            id
                        }
                    }
                    updates {
                        nodes {
                            id
                        }
                    } 
                    deletes {
                        id
                    }
                    skippedExpiredStockLines {
                        nodes {
                            id
                        }
                    }
                    skippedOnHoldStockLines {
                        nodes {
                            id
                        }
                    }
                    issuedExpiringSoonStockLines {
                        nodes {
                            id
                        }
                    }
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|line_id| {
            assert_eq!(line_id, "unallocated_line");
            Ok(ServiceResult {
                inserts: vec![inline_init(|r: &mut InvoiceLine| {
                    r.invoice_line_row =
                        inline_init(|r: &mut InvoiceLineRow| r.id = "insert1".to_string())
                })],
                deletes: vec!["delete1".to_string()],
                updates: vec![
                    inline_init(|r: &mut InvoiceLine| {
                        r.invoice_line_row =
                            inline_init(|r: &mut InvoiceLineRow| r.id = "update1".to_string())
                    }),
                    inline_init(|r: &mut InvoiceLine| {
                        r.invoice_line_row =
                            inline_init(|r: &mut InvoiceLineRow| r.id = "update2".to_string())
                    }),
                ],
                skipped_expired_stock_lines: vec![inline_init(|r: &mut StockLine| {
                    r.stock_line_row.id = "skpped_expired".to_string();
                })],
                skipped_on_hold_stock_lines: vec![inline_init(|r: &mut StockLine| {
                    r.stock_line_row.id = "skipped_on_hold".to_string();
                })],
                issued_expiring_soon_stock_lines: vec![inline_init(|r: &mut StockLine| {
                    r.stock_line_row.id = "expiring_soon".to_string();
                })],
            })
        }));

        let expected = json!({
            "allocateOutboundShipmentUnallocatedLine": {
                "inserts": {
                    "nodes": [{
                        "id": "insert1"
                    }]
                },
                "deletes": [ {
                    "id": "delete1"
                }],
                "updates": {
                    "nodes": [{
                        "id": "update1"
                    },{
                        "id": "update2"
                    }]
                },
                "skippedExpiredStockLines": {
                    "nodes": [{
                        "id": "skpped_expired"
                    }]
                },
                "skippedOnHoldStockLines": {
                    "nodes": [{
                        "id": "skipped_on_hold"
                    }]
                },
                "issuedExpiringSoonStockLines": {
                    "nodes": [{
                        "id": "expiring_soon"
                    }]
                }
            }
          }
        );
        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
