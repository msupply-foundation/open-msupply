use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::simple_generic_errors::{
    CannotReverseInvoiceStatus, InvalidStockSelection, NodeError, RecordNotFound,
};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::{InvoiceLineConnector, InvoiceNode};

use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::prescription::{
    UpdatePrescription as ServiceInput, UpdatePrescriptionError as ServiceError,
    UpdatePrescriptionStatus,
};

use crate::mutations::outbound_shipment::error::InvoiceIsNotEditable;

#[derive(InputObject)]
#[graphql(name = "UpdatePrescriptionInput")]
pub struct UpdateInput {
    pub id: String,
    pub status: Option<UpdatePrescriptionStatusInput>,
    pub patient_id: Option<String>,
    pub clinician_id: Option<String>,
    pub prescription_date: Option<DateTime<Utc>>,
    pub comment: Option<String>,
    pub colour: Option<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdatePrescriptionStatusInput {
    Picked,
    Verified,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdatePrescriptionError")]
pub struct UpdateError {
    pub error: UpdatePrescriptionErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdatePrescriptionResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
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
            .update_prescription(&service_context, input.to_domain()),
    )
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

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdatePrescriptionErrorInterface {
    InvoiceDoesNotExist(RecordNotFound),
    CannotReverseInvoiceStatus(CannotReverseInvoiceStatus),
    InvoiceIsNotEditable(InvoiceIsNotEditable),
    CanOnlyChangeToPickedWhenNoUnallocatedLines(CanOnlyChangeToPickedWhenNoUnallocatedLines),
    StockNotAvailableAtDate(InvalidStockSelection),
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            status,
            patient_id,
            clinician_id,
            comment,
            colour,
            prescription_date,
        } = self;

        ServiceInput {
            id,
            status: status.map(|status| status.to_domain()),
            patient_id,
            clinician_id,
            comment,
            colour,
            prescription_datetime: prescription_date.map(|date| date.naive_utc()),
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdatePrescriptionErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(UpdatePrescriptionErrorInterface::InvoiceDoesNotExist(
                RecordNotFound {},
            ))
        }

        ServiceError::InvoiceIsNotEditable => {
            return Ok(UpdatePrescriptionErrorInterface::InvoiceIsNotEditable(
                InvoiceIsNotEditable,
            ))
        }

        ServiceError::StockNotAvailableAtDate(_) => {
            return Ok(UpdatePrescriptionErrorInterface::StockNotAvailableAtDate(
                InvalidStockSelection,
            ))
        }

        // Standard Graphql Errors
        ServiceError::NotAPrescriptionInvoice
        | ServiceError::ClinicianDoesNotExist
        | ServiceError::NotThisStoreInvoice
        | ServiceError::PatientDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_)
        | ServiceError::InvoiceLineHasNoStockLine(_)
        | ServiceError::UpdatedInvoiceDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
pub struct CanOnlyChangeToPickedWhenNoUnallocatedLines(pub InvoiceLineConnector);

#[Object]
impl CanOnlyChangeToPickedWhenNoUnallocatedLines {
    pub async fn description(&self) -> &'static str {
        "Cannot change to picked status when unallocated lines are present"
    }

    pub async fn invoice_lines(&self) -> &InvoiceLineConnector {
        &self.0
    }
}

impl UpdatePrescriptionStatusInput {
    pub fn to_domain(&self) -> UpdatePrescriptionStatus {
        use UpdatePrescriptionStatus::*;
        match self {
            UpdatePrescriptionStatusInput::Picked => Picked,
            UpdatePrescriptionStatusInput::Verified => Verified,
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
        mock::{mock_patient, mock_prescription_a, mock_store_a, MockDataInserts},
        Invoice, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{
            prescription::{
                UpdatePrescription as ServiceInput, UpdatePrescriptionError as ServiceError,
                UpdatePrescriptionStatus,
            },
            InvoiceServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceMutations;

    type InsertMethod = dyn Fn(ServiceInput) -> Result<Invoice, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertMethod>);

    impl InvoiceServiceTrait for TestService {
        fn update_prescription(
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
            "patientId": "n/a",
            "clinicianId": "n/a",
            "comment": "n/a",
            "colour": "n/a"
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_prescription_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_prescription_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdatePrescriptionInput!) {
            updatePrescription(input: $input, storeId: \"store_a\") {
                ... on UpdatePrescriptionError {
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
            "updatePrescription": {
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

        // NotAPrescriptionInvoice
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAPrescriptionInvoice)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //PatientDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::PatientDoesNotExist)));
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
    async fn test_graphql_update_prescription_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_update_prescription_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: UpdatePrescriptionInput!) {
            updatePrescription(storeId: $storeId, input: $input) {
                ... on InvoiceNode {
                    id
                    status
                    otherPartyId
                }
                ... on UpdatePrescriptionError {
                    error {
                      __typename
                    }
                  }
            }
          }
        "#;

        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    id: "id input".to_string(),
                    patient_id: Some("patient_a".to_string()),
                    clinician_id: Some("some_clinician".to_string()),
                    status: Some(UpdatePrescriptionStatus::Picked),
                    comment: Some("comment input".to_string()),
                    colour: Some("colour input".to_string()),
                    prescription_datetime: None,
                }
            );
            Ok(Invoice {
                invoice_row: mock_prescription_a(),
                name_row: mock_patient(),
                store_row: mock_store_a(),
                clinician_row: None,
            })
        }));

        let variables = json!({
          "input": {
            "id": "id input",
            "patientId": "patient_a",
            "clinicianId": "some_clinician",
            "status": "PICKED",
            "comment": "comment input",
            "colour": "colour input"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updatePrescription": {
                "id": mock_prescription_a().id,
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
