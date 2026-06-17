use async_graphql::*;

use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::outbound_shipment::DuplicateOutboundShipmentError as ServiceError;

pub fn duplicate(ctx: &Context<'_>, store_id: &str, id: String) -> Result<InvoiceNode> {
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
            .invoice_service
            .duplicate_outbound_shipment(&service_context, id),
    )
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<InvoiceNode> {
    match from {
        Ok(invoice) => Ok(InvoiceNode::from_domain(invoice)),
        Err(error) => Err(map_error(error)),
    }
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::InvoiceDoesNotExist
        | ServiceError::NotAnOutboundShipment
        | ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) | ServiceError::NewlyCreatedInvoiceDoesNotExist => {
            InternalError(formatted_error)
        }
    };

    graphql_error.extend()
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{mock_outbound_shipment_c, mock_name_a, mock_store_a, MockDataInserts},
        Invoice, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{
            outbound_shipment::DuplicateOutboundShipmentError as ServiceError, InvoiceServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceMutations;

    type DuplicateMethod = dyn Fn(String) -> Result<Invoice, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DuplicateMethod>);

    impl InvoiceServiceTrait for TestService {
        fn duplicate_outbound_shipment(
            &self,
            _: &ServiceContext,
            source_id: String,
        ) -> Result<Invoice, ServiceError> {
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
    async fn test_graphql_duplicate_outbound_shipment_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_duplicate_outbound_shipment_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($id: String!, $storeId: String!) {
            duplicateOutboundShipment(storeId: $storeId, id: $id) {
                id
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

        // NotAnOutboundShipment
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAnOutboundShipment)));
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
    async fn test_graphql_duplicate_outbound_shipment_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_duplicate_outbound_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String!, $id: String!) {
            duplicateOutboundShipment(storeId: $storeId, id: $id) {
                id
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|source_id| {
            assert_eq!(source_id, "source id".to_string());
            Ok(Invoice {
                invoice_row: mock_outbound_shipment_c(),
                name_row: mock_name_a(),
                store_row: mock_store_a(),
                clinician_row: None,
            })
        }));

        let variables = json!({
            "id": "source id",
            "storeId": "store_a"
        });

        let expected = json!({
            "duplicateOutboundShipment": {
                "id": mock_outbound_shipment_c().id
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
