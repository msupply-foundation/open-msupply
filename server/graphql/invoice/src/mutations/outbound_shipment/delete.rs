use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, RecordNotFound},
    ContextExt,
};
use graphql_types::{
    generic_errors::CannotDeleteInvoiceWithLines, types::DeleteResponse as GenericDeleteResponse,
};

use async_graphql::*;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::outbound_shipment::delete::DeleteOutboundShipmentError as ServiceError;

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
            .delete_outbound_shipment(&service_context, id),
    )
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
    use chrono::{NaiveDate, Utc};
    use graphql_core::test_helpers::setup_graphql_test_with_data;
    use graphql_core::{assert_graphql_query, assert_standard_graphql_error};

    use repository::mock::{MockData, MockDataInserts};
    use repository::{
        InvoiceRow, InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType, RepositoryError,
    };
    use serde_json::json;
    use util::inline_init;

    use crate::{InvoiceMutations, InvoiceQueries};

    #[actix_rt::test]
    async fn test_graphql_outbound_shipment_delete() {
        let (_, connection, _, settings) = setup_graphql_test_with_data(
            InvoiceQueries,
            InvoiceMutations,
            "omsupply-database-gql-outbound_shipment_delete",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![shipped_outbound_shipment(), outbound_shipment_no_lines()];
            }),
        )
        .await;

        fn shipped_outbound_shipment() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "shipped_outbound_shipment".to_string();
                r.name_link_id = String::from("name_store_a");
                r.store_id = String::from("store_a");
                r.invoice_number = 3;
                r.r#type = InvoiceRowType::OutboundShipment;
                r.status = InvoiceRowStatus::Shipped;
                r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 5)
                    .unwrap()
                    .and_hms_milli_opt(15, 30, 0, 0)
                    .unwrap();
                r.picked_datetime = Some(Utc::now().naive_utc());
                r.shipped_datetime = Some(Utc::now().naive_utc());
                r.allocated_datetime = Some(
                    NaiveDate::from_ymd_opt(1970, 1, 5)
                        .unwrap()
                        .and_hms_milli_opt(15, 30, 0, 0)
                        .unwrap(),
                );
            })
        }

        fn outbound_shipment_no_lines() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = String::from("outbound_shipment_no_lines_test");
                r.name_link_id = String::from("name_store_a");
                r.store_id = String::from("store_a");
                r.r#type = InvoiceRowType::OutboundShipment;
                r.status = InvoiceRowStatus::Picked;
                r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 6)
                    .unwrap()
                    .and_hms_milli_opt(15, 30, 0, 0)
                    .unwrap();
                r.picked_datetime = Some(Utc::now().naive_utc());
                r.allocated_datetime = Some(
                    NaiveDate::from_ymd_opt(1970, 1, 6)
                        .unwrap()
                        .and_hms_milli_opt(15, 30, 0, 0)
                        .unwrap(),
                );
            })
        }

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
          "id": "shipped_outbound_shipment"
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

        // Note that lines are not deleted when an invoice is deleted, due to issues with batch deletes.
        // TODO: implement delete lines. See https://github.com/openmsupply/remote-server/issues/839 for details.
        // CannotDeleteInvoiceWithLines

        // Test succeeding delete
        let variables = Some(json!({
          "id": outbound_shipment_no_lines().id
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "id": outbound_shipment_no_lines().id
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
        // test entry has been deleted
        assert_eq!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id(&outbound_shipment_no_lines().id)
                .expect_err("Invoice not deleted"),
            RepositoryError::NotFound
        );
    }
}
