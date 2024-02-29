use async_graphql::*;
use graphql_core::generic_inputs::TaxInput;
use graphql_core::simple_generic_errors::{CannotReverseInvoiceStatus, NodeError, RecordNotFound};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::{InvoiceLineConnector, InvoiceNode};

use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::outbound_shipment::update::{
    UpdateOutboundShipment as ServiceInput, UpdateOutboundShipmentError as ServiceError,
    UpdateOutboundShipmentStatus,
};
use service::invoice_line::ShipmentTaxUpdate;

use super::error::{
    CannotChangeStatusOfInvoiceOnHold, CannotIssueInForeignCurrency, InvoiceIsNotEditable,
    NotAnOutboundShipmentError,
};

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundShipmentInput")]
pub struct UpdateInput {
    /// The new invoice id provided by the client
    pub id: String,
    /// When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
    /// existing invoice items gets updated.
    status: Option<UpdateOutboundShipmentStatusInput>,
    on_hold: Option<bool>,
    comment: Option<String>,
    /// External invoice reference, e.g. purchase or shipment number
    their_reference: Option<String>,
    transport_reference: Option<String>,
    colour: Option<String>,
    tax: Option<TaxInput>,
    currency_id: Option<String>,
    currency_rate: Option<f64>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateOutboundShipmentStatusInput {
    Allocated,
    Picked,
    Shipped,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateOutboundShipmentError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateOutboundShipmentResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
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
            .update_outbound_shipment(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(invoice_line) => UpdateResponse::Response(InvoiceNode::from_domain(invoice_line)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    InvoiceDoesNotExist(RecordNotFound),
    CannotReverseInvoiceStatus(CannotReverseInvoiceStatus),
    CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold),
    InvoiceIsNotEditable(InvoiceIsNotEditable),
    NotAnOutboundShipment(NotAnOutboundShipmentError),
    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(CanOnlyChangeToAllocatedWhenNoUnallocatedLines),
    CannotIssueInForeignCurrency(CannotIssueInForeignCurrency),
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            status,
            on_hold,
            comment,
            their_reference,
            colour,
            transport_reference,
            tax,
            currency_id,
            currency_rate,
        } = self;

        ServiceInput {
            id,
            status: status.map(|status| status.to_domain()),
            on_hold,
            comment,
            their_reference,
            colour,
            transport_reference,
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

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(UpdateErrorInterface::InvoiceDoesNotExist(RecordNotFound {}))
        }
        ServiceError::CannotReverseInvoiceStatus => {
            return Ok(UpdateErrorInterface::CannotReverseInvoiceStatus(
                CannotReverseInvoiceStatus,
            ))
        }
        ServiceError::InvoiceIsNotEditable => {
            return Ok(UpdateErrorInterface::InvoiceIsNotEditable(
                InvoiceIsNotEditable,
            ))
        }

        ServiceError::CannotChangeStatusOfInvoiceOnHold => {
            return Ok(UpdateErrorInterface::CannotChangeStatusOfInvoiceOnHold(
                CannotChangeStatusOfInvoiceOnHold,
            ))
        }
        ServiceError::CanOnlyChangeToAllocatedWhenNoUnallocatedLines(lines) => {
            return Ok(
                UpdateErrorInterface::CanOnlyChangeToAllocatedWhenNoUnallocatedLines(
                    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(InvoiceLineConnector::from_vec(
                        lines,
                    )),
                ),
            )
        }
        ServiceError::CannotIssueInForeignCurrency => {
            return Ok(UpdateErrorInterface::CannotIssueInForeignCurrency(
                CannotIssueInForeignCurrency,
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::InvoiceLineHasNoStockLine(_) => InternalError(formatted_error),
        ServiceError::UpdatedInvoiceDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
pub struct CanOnlyChangeToAllocatedWhenNoUnallocatedLines(pub InvoiceLineConnector);

#[Object]
impl CanOnlyChangeToAllocatedWhenNoUnallocatedLines {
    pub async fn description(&self) -> &'static str {
        "Cannot change to allocated status when unallocated lines are present"
    }

    pub async fn invoice_lines(&self) -> &InvoiceLineConnector {
        &self.0
    }
}

impl UpdateOutboundShipmentStatusInput {
    pub fn to_domain(&self) -> UpdateOutboundShipmentStatus {
        use UpdateOutboundShipmentStatus::*;
        match self {
            UpdateOutboundShipmentStatusInput::Allocated => Allocated,
            UpdateOutboundShipmentStatusInput::Picked => Picked,
            UpdateOutboundShipmentStatusInput::Shipped => Shipped,
        }
    }
}

#[cfg(test)]
mod graphql {
    use graphql_core::test_helpers::setup_graphl_test;
    use graphql_core::{assert_graphql_query, assert_standard_graphql_error};
    use repository::mock::{mock_new_invoice_with_unallocated_line, MockDataInserts};
    use serde_json::json;

    use crate::{InvoiceMutations, InvoiceQueries};

    #[actix_rt::test]
    async fn test_graphql_outbound_shipment_update() {
        let (mock_data, _, _, settings) = setup_graphl_test(
            InvoiceQueries,
            InvoiceMutations,
            "omsupply-database-gql-outbound_shipment_update",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeleteOutboundShipment($input: UpdateOutboundShipmentInput!) {
            updateOutboundShipment(input: $input, storeId: \"store_c\") {
                ... on UpdateOutboundShipmentError {
                  error {
                    __typename
                  }
                }
                ... on InvoiceNode {
                  id
                  comment
                  otherPartyStore {
                    id
                  }
                }
            }
        }"#;

        // CannotReverseInvoiceStatus
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_picked",
            "status": "ALLOCATED"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "CannotReverseInvoiceStatus"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // InvoiceIsNotEditable
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_shipped",
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "InvoiceIsNotEditable"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // RecordNotFound
        let variables = Some(json!({
          "input": {
            "id": "does not exist",
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // NotAnOutboundShipmentError
        let variables = Some(json!({
          "input": {
            "id": "inbound_shipment_a",
          }
        }));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            &expected_message,
            None,
            None
        );

        // InvoiceLineHasNoStockLineError
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_invalid_stock_line",
            "status": "SHIPPED"
          }
        }));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            &expected_message,
            None,
            None
        );
        // CanOnlyChangeToAllocatedWhenNoUnallocatedLines
        let variables = Some(json!({
          "input": {
            "id": mock_new_invoice_with_unallocated_line().id.clone(),
            "status": "ALLOCATED"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "CanOnlyChangeToAllocatedWhenNoUnallocatedLines"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // Invoice
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_invalid_stock_line",
            "status": "SHIPPED"
          }
        }));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            &expected_message,
            None,
            None
        );

        // test DRAFT to CONFIRMED
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_c",
            "status": "PICKED",
            "comment": "test_comment"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "id": "outbound_shipment_c",
              "comment": "test_comment"
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // test DRAFT to FINALISED (while setting onHold to true)
        let full_invoice = mock_data["base"].full_invoices.get("draft_ci_a").unwrap();
        let invoice_id = full_invoice.invoice.id.clone();
        let variables = Some(json!({
          "input": {
            "id": invoice_id,
            "status": "SHIPPED",
            "comment": "test_comment_b",
            "onHold": true,
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "id": invoice_id,
              "comment": "test_comment_b"
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // test Status Change on Hold
        let full_invoice = mock_data["base"]
            .full_invoices
            .get("outbound_shipment_on_hold")
            .unwrap();
        let invoice_id = full_invoice.invoice.id.clone();

        let variables = Some(json!({
          "input": {
            "id": invoice_id,
            "status": "SHIPPED",
            "comment": "test_comment_b"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "CannotChangeStatusOfInvoiceOnHold"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // test Status Change and on hold change
        let full_invoice = mock_data["base"]
            .full_invoices
            .get("outbound_shipment_on_hold")
            .unwrap();
        let invoice_id = full_invoice.invoice.id.clone();

        let variables = Some(json!({
          "input": {
            "id": invoice_id,
            "status": "SHIPPED",
            "onHold": false,
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "id": invoice_id,
              "comment": null
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
    }
}
