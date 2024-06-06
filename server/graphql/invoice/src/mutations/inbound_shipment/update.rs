use crate::mutations::outbound_shipment::error::{
    CannotChangeStatusOfInvoiceOnHold, CannotIssueInForeignCurrency,
};
use async_graphql::*;

use graphql_core::generic_inputs::TaxInput;
use graphql_core::simple_generic_errors::{
    CannotEditInvoice, OtherPartyNotASupplier, OtherPartyNotVisible,
};
use graphql_core::simple_generic_errors::{CannotReverseInvoiceStatus, RecordNotFound};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::inbound_shipment::{
    UpdateInboundShipment as ServiceInput, UpdateInboundShipmentError as ServiceError,
    UpdateInboundShipmentStatus,
};
use service::invoice_line::ShipmentTaxUpdate;

#[derive(InputObject)]
#[graphql(name = "UpdateInboundShipmentInput")]
pub struct UpdateInput {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<UpdateInboundShipmentStatusInput>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
    pub tax: Option<TaxInput>,
    pub currency_id: Option<String>,
    pub currency_rate: Option<f64>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateInboundShipmentStatusInput {
    Delivered,
    Verified,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateInboundShipmentError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateInboundShipmentResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
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
            .update_inbound_shipment(&service_context, input.to_domain()),
    )
}

#[derive(Interface)]
#[graphql(name = "UpdateInboundShipmentErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
    OtherPartyNotVisible(OtherPartyNotVisible),
    CannotEditInvoice(CannotEditInvoice),
    CannotReverseInvoiceStatus(CannotReverseInvoiceStatus),
    CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold),
    CannotIssueForeignCurrencyForInternalSuppliers(CannotIssueInForeignCurrency),
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            other_party_id,
            status,
            on_hold,
            comment,
            their_reference,
            colour,
            tax,
            currency_id,
            currency_rate,
        } = self;

        ServiceInput {
            id,
            other_party_id,
            status: status.map(|status| status.to_domain()),
            on_hold,
            comment,
            their_reference,
            colour,
            tax: tax.and_then(|tax| {
                Some(ShipmentTaxUpdate {
                    percentage: tax.percentage,
                })
            }),
            currency_id,
            currency_rate,
        }
    }
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(invoice) => UpdateResponse::Response(InvoiceNode::from_domain(invoice)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound))
        }
        ServiceError::CannotReverseInvoiceStatus => {
            return Ok(UpdateErrorInterface::CannotReverseInvoiceStatus(
                CannotReverseInvoiceStatus,
            ))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(UpdateErrorInterface::CannotEditInvoice(CannotEditInvoice))
        }

        ServiceError::CannotChangeStatusOfInvoiceOnHold => {
            return Ok(UpdateErrorInterface::CannotChangeStatusOfInvoiceOnHold(
                CannotChangeStatusOfInvoiceOnHold,
            ))
        }
        ServiceError::OtherPartyNotASupplier => {
            return Ok(UpdateErrorInterface::OtherPartyNotASupplier(
                OtherPartyNotASupplier,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(UpdateErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        ServiceError::CannotIssueForeignCurrencyForInternalSuppliers => {
            return Ok(
                UpdateErrorInterface::CannotIssueForeignCurrencyForInternalSuppliers(
                    CannotIssueInForeignCurrency,
                ),
            )
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::UpdatedInvoiceDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdateInboundShipmentStatusInput {
    pub fn to_domain(&self) -> UpdateInboundShipmentStatus {
        use UpdateInboundShipmentStatus::*;
        match self {
            UpdateInboundShipmentStatusInput::Delivered => Delivered,
            UpdateInboundShipmentStatusInput::Verified => Verified,
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{
            mock_inbound_shipment_c, mock_name_linked_to_store, mock_name_not_linked_to_store,
            mock_name_store_a, mock_store_a, mock_store_linked_to_name, MockDataInserts,
        },
        Invoice, InvoiceRowRepository, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{
            inbound_shipment::{
                UpdateInboundShipment as ServiceInput, UpdateInboundShipmentError as ServiceError,
                UpdateInboundShipmentStatus,
            },
            InvoiceServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceMutations;

    type InsertMethod = dyn Fn(ServiceInput) -> Result<Invoice, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertMethod>);

    impl InvoiceServiceTrait for TestService {
        fn update_inbound_shipment(
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
            "onHold": false,
            "comment": "n/a",
            "theirReference": "n/a",
            "colour": "n/a"
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_inbound_line_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_update_inbound_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateInboundShipmentInput!) {
            updateInboundShipment(input: $input, storeId: \"store_a\") {
                ... on UpdateInboundShipmentError {
                    error {
                        __typename
                    }
                }
            }
        }
        "#;

        //InvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "updateInboundShipment": {
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

        //CannotReverseInvoiceStatus
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotReverseInvoiceStatus)));

        let expected = json!({
            "updateInboundShipment" : {
                "error": {
                    "__typename": "CannotReverseInvoiceStatus"
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

        //CannotEditFinalised
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotEditFinalised)));

        let expected = json!({
            "updateInboundShipment" : {
                "error": {
                    "__typename": "CannotEditInvoice"
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

        //CannotChangeStatusOfInvoiceOnHold
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::CannotChangeStatusOfInvoiceOnHold)
        }));

        let expected = json!({
            "updateInboundShipment" : {
                "error": {
                    "__typename": "CannotChangeStatusOfInvoiceOnHold"
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

        //OtherPartyNotASupplier
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyNotASupplier)));

        let expected = json!({
            "updateInboundShipment" : {
                "error": {
                    "__typename": "OtherPartyNotASupplier"
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

        // OtherPartyNotVisible
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyNotVisible)));

        let expected = json!({
            "updateInboundShipment" : {
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

        //NotThisStoreInvoice
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

        //NotAnInboundShipment
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

        //DatabaseError
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

        //UpdateInvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::UpdatedInvoiceDoesNotExist)));
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
    async fn test_graphql_update_inbound_shipment_success() {
        let (mock_data, connection, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_update_inbound_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: UpdateInboundShipmentInput!) {
            updateInboundShipment(storeId: $storeId, input: $input) {
                ... on InvoiceNode {
                    id
                    status
                    otherPartyId
                    otherPartyStore {
                        id
                    }
                }
                ... on UpdateInboundShipmentError {
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
                    status: Some(UpdateInboundShipmentStatus::Verified),
                    on_hold: Some(false),
                    comment: Some("comment input".to_string()),
                    their_reference: Some("their reference input".to_string()),
                    colour: Some("colour input".to_string()),
                    tax: None,
                    currency_id: None,
                    currency_rate: None
                }
            );
            Ok(Invoice {
                invoice_row: mock_inbound_shipment_c(),
                name_row: mock_name_store_a(),
                store_row: mock_store_a(),
                clinician_row: None,
            })
        }));

        let variables = json!({
          "input": {
            "id": "id input",
            "otherPartyId": "other party input",
            "status": "VERIFIED",
            "onHold": false,
            "comment": "comment input",
            "theirReference": "their reference input",
            "colour": "colour input"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateInboundShipment": {
                "id": mock_inbound_shipment_c().id,
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

        //Test name store id linked to store
        let variables = json!({
          "input": {
            "id": "inbound_shipment_c",
            "otherPartyId": mock_name_linked_to_store().id,
          },
          "storeId": "store_a"
        });

        let expected = json!({
          "updateInboundShipment": {
            "id": "inbound_shipment_c",
            "otherPartyId": mock_name_linked_to_store().id,
            "otherPartyStore": {
              "id": mock_store_linked_to_name().id
            },
          },
        });

        assert_graphql_query!(&settings, mutation, &Some(variables), &expected, None);

        let new_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("inbound_shipment_c")
            .unwrap()
            .unwrap();

        assert_eq!(
            new_invoice.name_store_id,
            Some(mock_store_linked_to_name().id)
        );

        //Test name store id not linked to store
        let variables = json!({
          "input": {
            "id": "inbound_shipment_c",
            "otherPartyId": mock_name_not_linked_to_store().id,
          },
          "storeId": "store_a"
        });

        let expected = json!({
          "updateInboundShipment": {
            "id": "inbound_shipment_c",
            "otherPartyId": mock_name_not_linked_to_store().id,
            "otherPartyStore": null,
          },
        });

        assert_graphql_query!(&settings, mutation, &Some(variables), &expected, None);

        let new_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("inbound_shipment_c")
            .unwrap()
            .unwrap();

        assert_eq!(new_invoice.name_store_id, None);

        //Test status to FINALISED (while setting onHold to true)
        let variables = json!({
          "input": {
            "id": "inbound_shipment_c",
            "status": "VERIFIED",
            "onHold": true,
          },
          "storeId": "store_a"
        });

        let expected = json!({
          "updateInboundShipment": {
            "id": "inbound_shipment_c",
            "status": "VERIFIED",
          },
        });

        assert_graphql_query!(&settings, mutation, &Some(variables), &expected, None);

        //Test status change on hold
        let full_invoice = mock_data["base"]
            .full_invoices
            .get("inbound_shipment_on_hold")
            .unwrap();
        let invoice_id = full_invoice.invoice.id.clone();

        let variables = json!({
          "input": {
            "id": invoice_id,
            "status": "DELIVERED",
            "comment": "test_comment_b"
          },
          "storeId": "store_a"
        });
        let expected = json!({
            "updateInboundShipment": {
              "error": {
                "__typename": "CannotChangeStatusOfInvoiceOnHold"
              }
            }
          }
        );
        assert_graphql_query!(&settings, mutation, &Some(variables), &expected, None);

        // test Status Change and on hold change
        let full_invoice = mock_data["base"]
            .full_invoices
            .get("inbound_shipment_on_hold")
            .unwrap();
        let invoice_id = full_invoice.invoice.id.clone();

        let variables = json!({
          "input": {
            "id": invoice_id,
            "status": "DELIVERED",
            "onHold": false,
          },
          "storeId": "store_a"
        });
        let expected = json!({
            "updateInboundShipment": {
              "id": invoice_id,
            }
          }
        );
        assert_graphql_query!(&settings, mutation, &Some(variables), &expected, None);
    }
}
