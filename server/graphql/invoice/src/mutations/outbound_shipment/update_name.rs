use super::error::{InvoiceIsNotEditable, NotAnOutboundShipmentError};
use async_graphql::*;

use graphql_core::{
    simple_generic_errors::{OtherPartyNotACustomer, OtherPartyNotVisible, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::outbound_shipment::{
    UpdateOutboundShipmentName as ServiceInput, UpdateOutboundShipmentNameError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundShipmentNameInput")]
pub struct UpdateNameInput {
    pub id: String,
    other_party_id: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateOutboundShipmentNameError")]
pub struct UpdateNameError {
    pub error: UpdateNameErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateOutboundShipmentNameResponse")]
pub enum UpdateNameResponse {
    Error(UpdateNameError),
    Response(InvoiceNode),
}

pub fn update_name(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateNameInput,
) -> Result<UpdateNameResponse> {
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
            .update_outbound_shipment_name(&service_context, input.to_domain()),
    )
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateNameErrorInterface {
    InvoiceDoesNotExist(RecordNotFound),
    InvoiceIsNotEditable(InvoiceIsNotEditable),
    OtherPartyNotACustomer(OtherPartyNotACustomer),
    OtherPartyNotVisible(OtherPartyNotVisible),
    NotAnOutboundShipment(NotAnOutboundShipmentError),
}

impl UpdateNameInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateNameInput { id, other_party_id } = self;

        ServiceInput { id, other_party_id }
    }
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<UpdateNameResponse> {
    let result = match from {
        Ok(invoice_line) => UpdateNameResponse::Response(InvoiceNode::from_domain(invoice_line)),
        Err(error) => UpdateNameResponse::Error(UpdateNameError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpdateNameErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::InvoiceDoesNotExist => {
            return Ok(UpdateNameErrorInterface::InvoiceDoesNotExist(
                RecordNotFound {},
            ))
        }
        ServiceError::InvoiceIsNotEditable => {
            return Ok(UpdateNameErrorInterface::InvoiceIsNotEditable(
                InvoiceIsNotEditable,
            ))
        }
        ServiceError::OtherPartyNotACustomer => {
            return Ok(UpdateNameErrorInterface::OtherPartyNotACustomer(
                OtherPartyNotACustomer,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(UpdateNameErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::UpdatedInvoiceDoesNotExist => InternalError(formatted_error),
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
        mock::{mock_name_store_a, mock_outbound_shipment_a, mock_store_a, MockDataInserts},
        Invoice, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{
            outbound_shipment::{
                UpdateOutboundShipmentName as ServiceInput,
                UpdateOutboundShipmentNameError as ServiceError,
            },
            InvoiceServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceMutations;

    type InsertMethod = dyn Fn(ServiceInput) -> Result<Invoice, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertMethod>);

    impl InvoiceServiceTrait for TestService {
        fn update_outbound_shipment_name(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<Invoice, ServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.invoice_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
            "otherPartyId": "n/a",
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_outbound_name_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_update_outbound_name_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateOutboundShipmentNameInput!) {
            updateOutboundShipmentName(input: $input, storeId: \"store_a\") {
                ... on UpdateOutboundShipmentNameError {
                    error {
                        __typename
                    }
                }
            }
        }
        "#;

        // InvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "updateOutboundShipmentName": {
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

        // OtherPartyNotACustomer
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyNotACustomer)));

        let expected = json!({
            "updateOutboundShipmentName": {
              "error": {
                "__typename": "OtherPartyNotACustomer"
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

        // OtherPartyNotVisible
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyNotVisible)));

        let expected = json!({
            "updateOutboundShipmentName" : {
                "error": {
                    "__typename": "OtherPartyNotVisible"
                }
            }
        });

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
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

        // OtherPartyDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyDoesNotExist)));
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
            Err(ServiceError::DatabaseError(
                RepositoryError::UniqueViolation("row already exists".to_string()),
            ))
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
    async fn test_graphql_update_outbound_shipment_name_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_update_outbound_shipment_name_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
            mutation ($storeId: String, $input: UpdateOutboundShipmentNameInput!) {
                updateOutboundShipmentName(storeId: $storeId, input: $input) {
                    ... on InvoiceNode {
                        id
                        otherPartyId
    
                    }
                    ... on UpdateOutboundShipmentNameError {
                        error {
                          __typename
                        }
                      }
                }
              }
            "#;

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    id: "id input".to_string(),
                    other_party_id: Some("other party input".to_string()),
                }
            );
            Ok(Invoice {
                invoice_row: mock_outbound_shipment_a(),
                name_row: mock_name_store_a(),
                store_row: mock_store_a(),
                clinician_row: None,
            })
        }));

        let variables = json!({
          "input": {
            "id": "id input",
            "otherPartyId": "other party input",
          },
          "storeId": "store_b"
        });

        let expected = json!({
            "updateOutboundShipmentName": {
                "id": mock_outbound_shipment_a().id,
                "otherPartyId": mock_name_store_a().id
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
