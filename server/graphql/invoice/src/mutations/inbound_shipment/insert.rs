use async_graphql::*;

use graphql_core::simple_generic_errors::{OtherPartyNotASupplier, OtherPartyNotVisible};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::inbound_shipment::{
    InsertInboundShipment as ServiceInput, InsertInboundShipmentError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "InsertInboundShipmentInput")]
pub struct InsertInput {
    pub id: String,
    pub other_party_id: String,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertInboundShipmentError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertInboundShipmentResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
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
            .insert_inbound_shipment(&service_context, input.to_domain()),
    )
}

#[derive(Interface)]
#[graphql(name = "InsertInboundShipmentErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            other_party_id,
            on_hold,
            comment,
            their_reference,
            colour,
        } = self;

        ServiceInput {
            id,
            other_party_id,
            on_hold,
            comment,
            their_reference,
            colour,
        }
    }
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(invoice) => InsertResponse::Response(InvoiceNode::from_domain(invoice)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::OtherPartyNotASupplier => {
            return Ok(InsertErrorInterface::OtherPartyNotASupplier(
                OtherPartyNotASupplier,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(InsertErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        // Standard Graphql Errors
        ServiceError::InvoiceAlreadyExists => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedInvoiceDoesNotExist => InternalError(formatted_error),
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
                InsertInboundShipment as ServiceInput, InsertInboundShipmentError as ServiceError,
            },
            InvoiceServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceMutations;

    type InsertMethod = dyn Fn(ServiceInput) -> Result<Invoice, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertMethod>);

    impl InvoiceServiceTrait for TestService {
        fn insert_inbound_shipment(
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
                "otherPartyId": "n/a"
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_inbound_shipment_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_insert_inbound_shipment_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertInboundShipmentInput!, $storeId: String) {
            insertInboundShipment(storeId: $storeId, input: $input) {
              ... on InsertInboundShipmentError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // OtherPartyNotASupplier
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyNotASupplier)));

        let expected = json!({
            "insertInboundShipment": {
              "error": {
                "__typename": "OtherPartyNotASupplier"
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
            "insertInboundShipment": {
              "error": {
                "__typename": "OtherPartyNotVisible"
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

        // InvoiceAlreadyExists
        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceAlreadyExists)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //OtherPartyDoesNotExist
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

        //Database Error
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

        //NewlyCreatedInvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::NewlyCreatedInvoiceDoesNotExist)
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
    async fn test_graphql_insert_inbound_shipment_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_insert_inbound_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: InsertInboundShipmentInput!) {
            insertInboundShipment(storeId: $storeId, input: $input) {
                ... on InvoiceNode {
                    id
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
                    other_party_id: "other party input".to_string(),
                    on_hold: Some(true),
                    comment: Some("comment input".to_string()),
                    their_reference: Some("reference input".to_string()),
                    colour: Some("colour input".to_string()),
                }
            );
            Ok(Invoice {
                invoice_row: mock_inbound_shipment_c(),
                name_row: mock_name_a(),
                store_row: mock_store_a(),
                clinician_row: None,
            })
        }));

        let variables = json!({
            "input": {
                "id": "id input",
                "otherPartyId": "other party input",
                "onHold": true,
                "comment": "comment input",
                "theirReference": "reference input",
                "colour": "colour input"
            },
            "storeId": "store_a"
        });

        let expected = json!({
            "insertInboundShipment": {
                "id": mock_inbound_shipment_c().id
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
