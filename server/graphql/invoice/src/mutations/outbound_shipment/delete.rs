use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, RecordNotFound},
    ContextExt,
};
use graphql_types::{
    generic_errors::CannotDeleteInvoiceWithLines,
    types::{DeleteResponse as GenericDeleteResponse, InvoiceLineConnector},
};

use async_graphql::*;
use service::authorisation::{Resource, ResourceAccessRequest};
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

pub fn delete(ctx: &Context<'_>, store_id: &str, id: String) -> Result<DeleteResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    map_response(service_provider.invoice_service.delete_outbound_shipment(
        &service_context,
        store_id,
        id,
    ))
}

pub fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(id) => DeleteResponse::Response(GenericDeleteResponse(id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
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
        ServiceError::LineDeleteError { .. } => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod graphql {

    use graphql_core::test_helpers::setup_graphl_test;
    use graphql_core::{assert_graphql_query, assert_standard_graphql_error};

    use repository::mock::MockDataInserts;
    use repository::{InvoiceRowRepository, RepositoryError};
    use serde_json::json;

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

        // OtherPartyNotACustomer
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

        // TODO https://github.com/openmsupply/remote-server/issues/839
        // CannotDeleteInvoiceWithLines
        // let variables = Some(json!({
        //   "id": "outbound_shipment_a"
        // }));
        // let expected = json!({
        //     "deleteOutboundShipment": {
        //       "error": {
        //         "__typename": "CannotDeleteInvoiceWithLines"
        //       }
        //     }
        //   }
        // );
        // assert_graphql_query!(&settings, query, &variables, &expected, None);

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
            InvoiceRowRepository::new(&connection)
                .find_one_by_id("outbound_shipment_no_lines")
                .expect_err("Invoice not deleted"),
            RepositoryError::NotFound
        );
    }
}
