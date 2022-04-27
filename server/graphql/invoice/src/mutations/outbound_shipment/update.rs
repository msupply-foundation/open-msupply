use super::{CannotChangeStatusOfInvoiceOnHold, InvoiceIsNotEditable, NotAnOutboundShipmentError};

use async_graphql::*;
use graphql_core::simple_generic_errors::{
    CannotReverseInvoiceStatus, NodeError, OtherPartyNotACustomer, OtherPartyNotVisible,
    RecordNotFound,
};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::{InvoiceLineConnector, InvoiceNode};

use repository::Invoice;
use service::invoice::outbound_shipment::{
    UpdateOutboundShipment as ServiceInput, UpdateOutboundShipmentError as ServiceError,
    UpdateOutboundShipmentStatus,
};
use service::permission_validation::{Resource, ResourceAccessRequest};

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundShipmentInput")]
pub struct UpdateInput {
    /// The new invoice id provided by the client
    pub id: String,
    /// The other party must be a customer of the current store.
    /// This field can be used to change the other_party of an invoice
    other_party_id: Option<String>,
    /// When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
    /// existing invoice items gets updated.
    status: Option<UpdateOutboundShipmentStatusInput>,
    on_hold: Option<bool>,
    comment: Option<String>,
    /// External invoice reference, e.g. purchase or shipment number
    their_reference: Option<String>,
    transport_reference: Option<String>,
    colour: Option<String>,
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
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    map_response(service_provider.invoice_service.update_outbound_shipment(
        &service_context,
        store_id,
        input.to_domain(),
    ))
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
    InvoiceDoesNotExists(RecordNotFound),
    CannotReverseInvoiceStatus(CannotReverseInvoiceStatus),
    CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold),
    InvoiceIsNotEditable(InvoiceIsNotEditable),
    OtherPartyNotACustomer(OtherPartyNotACustomer),
    OtherPartyNotVisible(OtherPartyNotVisible),
    NotAnOutboundShipment(NotAnOutboundShipmentError),
    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(CanOnlyChangeToAllocatedWhenNoUnallocatedLines),
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
            transport_reference,
        } = self;

        ServiceInput {
            id,
            other_party_id,
            status: status.map(|status| status.to_domain()),
            on_hold,
            comment,
            their_reference,
            colour,
            transport_reference,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExists => {
            return Ok(UpdateErrorInterface::InvoiceDoesNotExists(
                RecordNotFound {},
            ))
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
        ServiceError::OtherPartyNotACustomer => {
            return Ok(UpdateErrorInterface::OtherPartyNotACustomer(
                OtherPartyNotACustomer,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(UpdateErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::InvoiceLineHasNoStockLine(_) => InternalError(formatted_error),
        ServiceError::UpdatedInvoicenDoesNotExist => InternalError(formatted_error),
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
    use repository::mock::{
        mock_name_linked_to_store, mock_name_not_linked_to_store,
        mock_new_invoice_with_unallocated_line, mock_store_linked_to_name,
    };
    use repository::mock::{mock_name_store_c, MockDataInserts};
    use repository::schema::StockLineRow;
    use repository::{
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceRowRepository, StockLineRowRepository,
    };
    use serde_json::json;

    use crate::{InvoiceMutations, InvoiceQueries};

    #[actix_rt::test]
    async fn test_graphql_outbound_shipment_update() {
        let (mock_data, connection, _, settings) = setup_graphl_test(
            InvoiceQueries,
            InvoiceMutations,
            "omsupply-database-gql-outbound_shipment_update",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeleteOutboundShipment($input: UpdateOutboundShipmentInput!) {
            updateOutboundShipment(input: $input, storeId: \"store_a\") {
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

        // ForeignKeyError (Other party does not exist)
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_a",
            "otherPartyId": "invalid_other_party"
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
        // OtherPartyNotACustomer
        let other_party_supplier = mock_name_store_c();
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_a",
            "otherPartyId": other_party_supplier.id
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "OtherPartyNotACustomer"
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

        // Test Success name_store_id, linked to store
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_c",
            "otherPartyId": mock_name_linked_to_store().id,
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "id": "outbound_shipment_c",
              "otherPartyStore": {
                "id": mock_store_linked_to_name().id
              }
            }
          }
        );

        assert_graphql_query!(&settings, query, &variables, &expected, None);

        let new_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("outbound_shipment_c")
            .unwrap();

        assert_eq!(
            new_invoice.name_store_id,
            Some(mock_store_linked_to_name().id)
        );

        // Test Success name_store_id, not linked to store
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_c",
            "otherPartyId": mock_name_not_linked_to_store().id,
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "id": "outbound_shipment_c",
              "otherPartyStore": null
            }
          }
        );

        assert_graphql_query!(&settings, query, &variables, &expected, None);

        let new_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("outbound_shipment_c")
            .unwrap();

        assert_eq!(new_invoice.name_store_id, None);

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

        // helpers to compare totals
        let stock_lines_for_invoice_lines = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_line_ids: Vec<String> = invoice_lines
                .iter()
                .filter_map(|invoice| invoice.stock_line_id.to_owned())
                .collect();
            StockLineRowRepository::new(&connection)
                .find_many_by_ids(&stock_line_ids)
                .unwrap()
        };
        // calculates the expected stock line total for every invoice line row
        let expected_stock_line_totals = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
            let expected_stock_line_totals: Vec<(StockLineRow, i32)> = stock_lines
                .into_iter()
                .map(|line| {
                    let invoice_line = invoice_lines
                        .iter()
                        .find(|il| il.stock_line_id.clone().unwrap() == line.id)
                        .unwrap();
                    let expected_total = line.total_number_of_packs - invoice_line.number_of_packs;
                    (line, expected_total)
                })
                .collect();
            expected_stock_line_totals
        };
        let assert_stock_line_totals =
            |invoice_lines: &Vec<InvoiceLineRow>, expected: &Vec<(StockLineRow, i32)>| {
                let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
                for line in stock_lines {
                    let expected = expected.iter().find(|l| l.0.id == line.id).unwrap();
                    assert_eq!(line.total_number_of_packs, expected.1);
                }
            };

        // test DRAFT to CONFIRMED
        let invoice_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id("outbound_shipment_c")
            .unwrap();
        let expected_totals = expected_stock_line_totals(&invoice_lines);
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
        assert_stock_line_totals(&invoice_lines, &expected_totals);

        // test DRAFT to FINALISED (while setting onHold to true)
        let full_invoice = mock_data["base"].full_invoices.get("draft_ci_a").unwrap();
        let invoice_id = full_invoice.invoice.id.clone();
        let invoice_lines = full_invoice.get_lines();
        let expected_totals = expected_stock_line_totals(&invoice_lines);
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
        assert_stock_line_totals(&invoice_lines, &expected_totals);

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
