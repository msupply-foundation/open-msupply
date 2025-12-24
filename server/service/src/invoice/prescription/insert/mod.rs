use crate::activity_log::activity_log_entry;
use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;
use crate::WithDBError;
use chrono::NaiveDateTime;
use repository::{ActivityLogType, Invoice};
use repository::{InvoiceRowRepository, RepositoryError};

mod generate;
use generate::generate;
mod validate;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use validate::validate;

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize, TS)]
pub struct InsertPrescription {
    pub id: String,
    pub patient_id: String,
    pub diagnosis_id: Option<String>,
    pub program_id: Option<String>,
    pub their_reference: Option<String>,
    pub clinician_id: Option<String>,
    pub prescription_date: Option<NaiveDateTime>,
}

#[derive(Debug, PartialEq)]
pub enum InsertPrescriptionError {
    InvoiceAlreadyExists,
    NotAPrescription,
    PatientDoesNotExist,
    // Internal error
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = InsertPrescriptionError;

pub fn insert_prescription(
    ctx: &ServiceContext,
    input: InsertPrescription,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_invoice = generate(connection, &ctx.store_id, &ctx.user_id, input)?;
            InvoiceRowRepository::new(connection).upsert_one(&new_invoice)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PrescriptionCreated,
                Some(new_invoice.id.to_string()),
                None,
                None,
            )?;

            get_invoice(ctx, None, &new_invoice.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for InsertPrescriptionError {
    fn from(error: RepositoryError) -> Self {
        InsertPrescriptionError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertPrescriptionError
where
    ERR: Into<InsertPrescriptionError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_patient, mock_prescription_a, mock_store_a, mock_user_account_a, MockData,
            MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceRow, InvoiceRowRepository, NameRow, NameRowType, NameStoreJoinRow,
    };

    use crate::{invoice::prescription::InsertPrescription, service_provider::ServiceProvider};

    use super::InsertPrescriptionError;

    type ServiceError = InsertPrescriptionError;

    #[actix_rt::test]
    async fn insert_prescription_errors() {
        fn not_visible() -> NameRow {
            NameRow {
                id: "not_visible".to_string(),
                ..Default::default()
            }
        }

        fn not_a_patient() -> NameRow {
            NameRow {
                id: "not_a_patient".to_string(),
                ..Default::default()
            }
        }

        fn not_a_patient_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "not_a_patient_join".to_string(),
                name_id: not_a_patient().id.clone(),
                store_id: mock_store_a().id.clone(),
                name_is_supplier: false,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_prescription_errors",
            MockDataInserts::all(),
            MockData {
                names: vec![not_visible(), not_a_patient()],
                name_store_joins: vec![not_a_patient_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        //InvoiceAlreadyExists
        assert_eq!(
            service.insert_prescription(
                &context,
                InsertPrescription {
                    id: mock_prescription_a().id.clone(),
                    patient_id: mock_patient().id.clone(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceAlreadyExists)
        );
        // PatientDoesNotExist
        assert_eq!(
            service.insert_prescription(
                &context,
                InsertPrescription {
                    id: "new_id".to_string(),
                    patient_id: "invalid".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::PatientDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn insert_prescription_success() {
        fn patient() -> NameRow {
            NameRow {
                id: "patient".to_string(),
                r#type: NameRowType::Patient,
                ..Default::default()
            }
        }

        fn patient_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "patient_join".to_string(),
                name_id: patient().id.clone(),
                store_id: mock_store_a().id.clone(),
                name_is_customer: true,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_prescription_success",
            MockDataInserts::all(),
            MockData {
                names: vec![patient()],
                name_store_joins: vec![patient_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Success
        service
            .insert_prescription(
                &context,
                InsertPrescription {
                    id: "new_id".to_string(),
                    patient_id: patient().id.clone(),
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_id")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                name_link_id: patient().id,
                user_id: Some(mock_user_account_a().id),
                ..invoice.clone()
            }
        );
    }
}
