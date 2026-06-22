use async_graphql::*;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceNode;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::inbound_shipment::{
    DuplicateInboundShipment as ServiceResult, DuplicateInboundShipmentError as ServiceError,
};

#[derive(SimpleObject)]
pub struct DuplicateInboundShipmentNode {
    pub invoice: InvoiceNode,
    pub skipped_item_count: u32,
}

pub struct SupplierIsInactive;
#[Object]
impl SupplierIsInactive {
    pub async fn description(&self) -> &str {
        "Cannot duplicate this shipment because its supplier is no longer active"
    }
}

#[derive(Interface)]
#[graphql(name = "DuplicateInboundShipmentErrorInterface")]
#[graphql(field(name = "description", ty = "&str"))]
pub enum DuplicateErrorInterface {
    SupplierIsInactive(SupplierIsInactive),
}

#[derive(SimpleObject)]
#[graphql(name = "DuplicateInboundShipmentError")]
pub struct DuplicateError {
    pub error: DuplicateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DuplicateInboundShipmentResponse")]
pub enum DuplicateResponse {
    Error(DuplicateError),
    Response(DuplicateInboundShipmentNode),
}

pub fn duplicate(ctx: &Context<'_>, store_id: &str, id: String) -> Result<DuplicateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_service
            .duplicate_inbound_shipment(&service_context, id),
    )
}

pub fn map_response(from: Result<ServiceResult, ServiceError>) -> Result<DuplicateResponse> {
    let result = match from {
        Ok(result) => DuplicateResponse::Response(DuplicateInboundShipmentNode {
            invoice: InvoiceNode::from_domain(result.invoice),
            skipped_item_count: result.skipped_item_count as u32,
        }),
        Err(error) => DuplicateResponse::Error(DuplicateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<DuplicateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Structured Errors
        ServiceError::SupplierIsInactive => {
            return Ok(DuplicateErrorInterface::SupplierIsInactive(
                SupplierIsInactive,
            ))
        }
        // Standard Graphql Errors
        ServiceError::InvoiceDoesNotExist
        | ServiceError::NotAnInboundShipment
        | ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) | ServiceError::NewlyCreatedInvoiceDoesNotExist => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{mock_inbound_shipment_c, mock_name_a, mock_store_a, MockDataInserts},
        Invoice, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{
            inbound_shipment::{
                DuplicateInboundShipment, DuplicateInboundShipmentError as ServiceError,
            },
            InvoiceServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceMutations;

    type DuplicateMethod =
        dyn Fn(String) -> Result<DuplicateInboundShipment, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DuplicateMethod>);

    impl InvoiceServiceTrait for TestService {
        fn duplicate_inbound_shipment(
            &self,
            _: &ServiceContext,
            source_id: String,
        ) -> Result<DuplicateInboundShipment, ServiceError> {
            self.0(source_id)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.invoice_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "id": "n/a",
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_duplicate_inbound_shipment_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_duplicate_inbound_shipment_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($id: String!, $storeId: String!) {
            duplicateInboundShipment(storeId: $storeId, id: $id) {
                ... on DuplicateInboundShipmentNode {
                    invoice {
                        id
                    }
                }
            }
          }
        "#;

        // InvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceDoesNotExist)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // SupplierIsInactive (structured error)
        let supplier_inactive_mutation = r#"
        mutation ($id: String!, $storeId: String!) {
            duplicateInboundShipment(storeId: $storeId, id: $id) {
                ... on DuplicateInboundShipmentError {
                    error {
                        __typename
                    }
                }
            }
          }
        "#;
        let test_service = TestService(Box::new(|_| Err(ServiceError::SupplierIsInactive)));
        let expected = json!({
            "duplicateInboundShipment": {
                "error": {
                    "__typename": "SupplierIsInactive"
                }
            }
        });
        assert_graphql_query!(
            &settings,
            supplier_inactive_mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotAnInboundShipment
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAnInboundShipment)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotThisStoreInvoice
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotThisStoreInvoice)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // DatabaseError
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::DatabaseError(RepositoryError::NotFound))
        }));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_duplicate_inbound_shipment_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_duplicate_inbound_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String!, $id: String!) {
            duplicateInboundShipment(storeId: $storeId, id: $id) {
                ... on DuplicateInboundShipmentNode {
                    invoice {
                        id
                    }
                    skippedItemCount
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|source_id| {
            assert_eq!(source_id, "source id".to_string());
            Ok(DuplicateInboundShipment {
                invoice: Invoice {
                    invoice_row: mock_inbound_shipment_c(),
                    name_row: mock_name_a(),
                    store_row: mock_store_a(),
                    clinician_row: None,
                },
                skipped_item_count: 2,
            })
        }));

        let variables = json!({
            "id": "source id",
            "storeId": "store_a"
        });

        let expected = json!({
            "duplicateInboundShipment": {
                "invoice": {
                    "id": mock_inbound_shipment_c().id
                },
                "skippedItemCount": 2
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
