use async_graphql::*;

use chrono::{DateTime, Utc};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::prescription::{
    InsertPrescription as ServiceInput, InsertPrescriptionError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "InsertPrescriptionInput")]
pub struct InsertInput {
    pub id: String,
    pub patient_id: String,
    pub diagnosis_id: Option<String>,
    pub program_id: Option<String>,
    pub their_reference: Option<String>,
    pub clinician_id: Option<String>,
    pub prescription_date: Option<DateTime<Utc>>,
}

#[derive(Union)]
#[graphql(name = "InsertPrescriptionResponse")]
pub enum InsertResponse {
    Response(InvoiceNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
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
            .insert_prescription(&service_context, input.to_domain()),
    )
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            patient_id,
            their_reference,
            diagnosis_id,
            program_id,
            clinician_id,
            prescription_date,
        } = self;

        ServiceInput {
            id,
            patient_id,
            their_reference,
            diagnosis_id,
            program_id,
            clinician_id,
            prescription_date: prescription_date.map(|date| date.naive_utc()),
        }
    }
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(invoice) => InsertResponse::Response(InvoiceNode::from_domain(invoice)),
        Err(error) => return map_error(error),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<InsertResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::NotAPrescription
        | ServiceError::InvoiceAlreadyExists
        | ServiceError::PatientDoesNotExist => BadUserInput(formatted_error),
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
        mock::{mock_patient, mock_prescription_a, mock_store_a, MockDataInserts},
        Invoice, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{
            prescription::{
                InsertPrescription as ServiceInput, InsertPrescriptionError as ServiceError,
            },
            InvoiceServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceMutations;

    type InsertMethod = dyn Fn(ServiceInput) -> Result<Invoice, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertMethod>);

    impl InvoiceServiceTrait for TestService {
        fn insert_prescription(
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
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.invoice_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
            "input": {
                "id": "n/a",
                "patientId": "n/a"
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_prescription_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_insert_prescription_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertPrescriptionInput!, $storeId: String) {
            insertPrescription(storeId: $storeId, input: $input) {
                ... on InvoiceNode {
                    id
                }
            }
          }
        "#;

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
    }

    #[actix_rt::test]
    async fn test_graphql_insert_prescription_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_insert_prescription_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: InsertPrescriptionInput!) {
            insertPrescription(storeId: $storeId, input: $input) {
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
                    patient_id: "patient input".to_string(),
                    ..Default::default()
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
                "patientId": "patient input"
            },
            "storeId": "store_a"
        });

        let expected = json!({
            "insertPrescription": {
                "id": mock_prescription_a().id
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
