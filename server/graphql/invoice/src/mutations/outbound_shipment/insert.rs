use async_graphql::*;
use graphql_core::simple_generic_errors::{OtherPartyNotACustomer, OtherPartyNotVisible};
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_core::{simple_generic_errors::NodeError, standard_graphql_error::validate_auth};
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::outbound_shipment::insert::{
    InsertOutboundShipment as ServiceInput, InsertOutboundShipmentError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "InsertOutboundShipmentInput")]
pub struct InsertInput {
    /// The new invoice id provided by the client
    pub id: String,
    /// The other party must be an customer of the current store
    other_party_id: String,
    on_hold: Option<bool>,
    comment: Option<String>,
    their_reference: Option<String>,
    colour: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundShipmentResponse")]
pub enum InsertResponse {
    Error(InsertError),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
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
            .insert_outbound_shipment(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(invoice_line) => InsertResponse::Response(InvoiceNode::from_domain(invoice_line)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
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
        }: InsertInput = self;

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

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    OtherPartyNotACustomer(OtherPartyNotACustomer),
    OtherPartyNotVisible(OtherPartyNotVisible),
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::OtherPartyNotACustomer => {
            return Ok(InsertErrorInterface::OtherPartyNotACustomer(
                OtherPartyNotACustomer,
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
mod graphql {
    use graphql_core::test_helpers::setup_graphql_test;
    use graphql_core::{assert_graphql_query, assert_standard_graphql_error};
    use repository::mock::{
        mock_name_linked_to_store, mock_name_not_linked_to_store, mock_name_store_b,
        mock_outbound_shipment_number_store_a, mock_store_linked_to_name,
    };
    use repository::mock::{mock_name_store_c, MockDataInserts};
    use repository::InvoiceRowRepository;
    use serde_json::json;
    use util::uuid::uuid;

    use crate::{InvoiceMutations, InvoiceQueries};

    #[actix_rt::test]
    async fn test_graphql_outbound_shipment_insert() {
        let (_, connection, _, settings) = setup_graphql_test(
            InvoiceQueries,
            InvoiceMutations,
            "omsupply-database-gql-outbound_shipment_insert",
            MockDataInserts::all(),
        )
        .await;

        let other_party_supplier = &mock_name_store_c();
        let other_party_customer = &mock_name_store_b();

        let starting_invoice_number = mock_outbound_shipment_number_store_a().value;

        let query = r#"mutation InsertOutboundShipment($input: InsertOutboundShipmentInput!) {
            insertOutboundShipment(input: $input, storeId: \"store_a\") {
                ... on InsertOutboundShipmentError {
                  error {
                    __typename
                  }
                }
                ... on NodeError {
                  error {
                    __typename
                  }
                }
                ... on InvoiceNode {
                    id
                    otherPartyId
                    otherPartyStore {
                      id
                    }
                    invoiceNumber
                    type
                    comment
                    theirReference
                    onHold
                    colour
                }
            }
        }"#;

        // OtherPartyNotACustomer
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": other_party_supplier.id,
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "error": {
                "__typename": "OtherPartyNotACustomer"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // ForeignKeyError (OtherPartyIdNotFoundError)
        let foreign_key_query = r#"mutation InsertOutboundShipment($input: InsertOutboundShipmentInput!) {
          insertOutboundShipment(input: $input, storeId: \"store_a\") {
             __typename
          }
        }"#;
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": "not existing",
          }
        }));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &foreign_key_query,
            &variables,
            &expected_message,
            None,
            None
        );
        // Test succeeding insert
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": other_party_customer.id,
            "comment": "ci comment",
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "id": "ci_insert_1",
              "invoiceNumber": starting_invoice_number+1,
              "otherPartyId": other_party_customer.id,
              "type": "OUTBOUND_SHIPMENT",
              "comment": "ci comment",
              "theirReference": null,
              "onHold": false,
              "colour": null,
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
        // make sure item has been inserted
        InvoiceRowRepository::new(&connection)
            .find_one_by_id("ci_insert_1")
            .unwrap();

        // Test succeeding insert on_hold and their_reference
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_2",
            "otherPartyId": other_party_customer.id,
            "theirReference": "reference",
            "onHold": true,
            "colour": "#FFFFFF"
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "id": "ci_insert_2",
              "invoiceNumber": starting_invoice_number+2,
              "otherPartyId": other_party_customer.id,
              "type": "OUTBOUND_SHIPMENT",
              "comment": null,
              "theirReference":"reference",
              "onHold": true,
              "colour": "#FFFFFF"
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // RecordAlreadyExist,
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": other_party_customer.id,
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

        // Test Success name_store_id, linked to store
        let id = uuid();
        let variables = Some(json!({
          "input": {
            "id": id,
            "otherPartyId": mock_name_linked_to_store().id,
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "id": id,
              "otherPartyStore": {
                "id": mock_store_linked_to_name().id
              }
            }
          }
        );

        assert_graphql_query!(&settings, query, &variables, &expected, None);

        let new_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&id)
            .unwrap();

        assert_eq!(
            new_invoice.name_store_id,
            Some(mock_store_linked_to_name().id)
        );

        // Test Success name_store_id, not linked to store
        let id = uuid();
        let variables = Some(json!({
          "input": {
            "id": id,
            "otherPartyId": mock_name_not_linked_to_store().id,
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "id": id,
              "otherPartyStore": null
            }
          }
        );

        assert_graphql_query!(&settings, query, &variables, &expected, None);

        let new_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&id)
            .unwrap();

        assert_eq!(new_invoice.name_store_id, None);
    }
}
