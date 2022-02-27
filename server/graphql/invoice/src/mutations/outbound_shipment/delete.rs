use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, RecordNotFound},
    ContextExt,
};
use graphql_types::{
    generic_errors::CannotDeleteInvoiceWithLines,
    types::{DeleteResponse as GenericDeleteResponse, InvoiceLineConnector},
};

use async_graphql::*;
use service::invoice::outbound_shipment::DeleteOutboundShipmentError as ServiceError;

#[derive(SimpleObject)]
#[graphql(name = "DeleteOutboundShipmentError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteOutboundShipmentResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, id: &str) -> Result<DeleteResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider.invoice_service.delete_outbound_shipment(
        &service_context,
        store_id,
        id,
    ) {
        Ok(deleted_id) => DeleteResponse::Response(GenericDeleteResponse(deleted_id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(DeleteErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::InvoiceLinesExists(lines) => {
            return Ok(DeleteErrorInterface::CannotDeleteInvoiceWithLines(
                CannotDeleteInvoiceWithLines(InvoiceLineConnector::from_vec(lines)),
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod graphql {
    use async_graphql::EmptyMutation;
    use chrono::{DateTime, Utc};
    use graphql_core::test_helpers::setup_graphl_test;
    use graphql_core::{assert_graphql_query, get_invoice_lines_inline, assert_standard_graphql_error};
    use repository::mock::{
        mock_name_linked_to_store, mock_name_not_linked_to_store,
        mock_outbound_shipment_number_store_a, mock_store_linked_to_name,
    };
    use repository::{mock::MockDataInserts, InvoiceFilter, InvoiceQueryRepository};
    use repository::{EqualFilter, InvoiceRepository, RepositoryError};
    use serde_json::json;
    use util::uuid::uuid;

    use crate::{InvoiceMutations, InvoiceQueries};

    #[actix_rt::test]
    async fn test_graphql_outbound_shipment_delete() {
        let (_, connection, _, settings) = setup_graphl_test(
            InvoiceQueries,
            InvoiceMutations,
            "omsupply-database-gql-outbound_shipment_delete",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeleteOutboundShipment($id: String!) {
            deleteOutboundShipment(id: $id, storeId: \"store_a\") {
                ... on DeleteOutboundShipmentError {
                  error {
                    __typename
                  }
                }
                ... on DeleteResponse {
                    id
                }
            }
        }"#;

        // OtherPartyNotACustomerError
        let variables = Some(json!({
          "id": "does not exist"
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // CannotEditInvoice
        let variables = Some(json!({
          "id": "outbound_shipment_shipped"
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "error": {
                "__typename": "CannotEditInvoice"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // NotAnOutboundShipment
        let variables = Some(json!({
          "id": "empty_draft_inbound_shipment"
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
        // CannotDeleteInvoiceWithLines
        let variables = Some(json!({
          "id": "outbound_shipment_a"
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "error": {
                "__typename": "CannotDeleteInvoiceWithLines"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // Test succeeding delete
        let variables = Some(json!({
          "id": "outbound_shipment_no_lines"
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "id": "outbound_shipment_no_lines"
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
        // test entry has been deleted
        assert_eq!(
            InvoiceRepository::new(&connection)
                .find_one_by_id("outbound_shipment_no_lines")
                .expect_err("Invoice not deleted"),
            RepositoryError::NotFound
        );
    }
}
