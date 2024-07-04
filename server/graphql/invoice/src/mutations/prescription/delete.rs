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
use service::invoice::prescription::DeletePrescriptionError as ServiceError;

#[derive(SimpleObject)]
#[graphql(name = "DeletePrescriptionError")]
pub struct DeleteError {
    pub error: DeletePrescriptionErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeletePrescriptionResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, id: String) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_service
            .delete_prescription(&service_context, id),
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
#[graphql(field(name = "description", ty = "&str"))]
pub enum DeletePrescriptionErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}

fn map_error(error: ServiceError) -> Result<DeletePrescriptionErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeletePrescriptionErrorInterface::RecordNotFound(
                RecordNotFound {},
            ))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(DeletePrescriptionErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice | ServiceError::NotAPrescriptionInvoice => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) | ServiceError::LineDeleteError { .. } => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod graphql {
    use graphql_core::test_helpers::setup_graphql_test;
    use graphql_core::{assert_graphql_query, assert_standard_graphql_error};

    use repository::mock::{mock_prescription_a, MockDataInserts};
    use repository::InvoiceRowRepository;
    use serde_json::json;

    use crate::{InvoiceMutations, InvoiceQueries};

    #[actix_rt::test]
    async fn test_graphql_delete_prescription() {
        let (_, connection, _, settings) = setup_graphql_test(
            InvoiceQueries,
            InvoiceMutations,
            "test_graphql_delete_prescription",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeletePrescription($id: String!) {
            deletePrescription(id: $id, storeId: \"store_a\") {
                ... on DeletePrescriptionError {
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
            "deletePrescription": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // CannotEditInvoice
        let variables = Some(json!({
          "id": "prescription_verified"
        }));
        let expected = json!({
            "deletePrescription": {
              "error": {
                "__typename": "CannotEditInvoice"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // NotAPrescriptionInvoice
        let variables = Some(json!({
          "id": "inbound_shipment_c"
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

        // Test succeeding delete
        let variables = Some(json!({
          "id": mock_prescription_a().id
        }));
        let expected = json!({
            "deletePrescription": {
              "id": mock_prescription_a().id
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
        // test entry has been deleted
        assert_eq!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id(&mock_prescription_a().id)
                .unwrap(),
            None
        );
    }
}
