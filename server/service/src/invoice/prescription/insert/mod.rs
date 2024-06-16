use crate::activity_log::activity_log_entry;
use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;
use crate::WithDBError;
use repository::{ActivityLogType, Invoice};
use repository::{InvoiceRowRepository, RepositoryError};

mod generate;
use generate::generate;
mod validate;
use validate::validate;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertPrescription {
    pub id: String,
    pub patient_id: String,
}

#[derive(Debug, PartialEq)]
pub enum InsertPrescriptionError {
    InvoiceAlreadyExists,
    NotAPerscription,
    // Name validation
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyNotAPatient,
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
            validate(connection, &ctx.store_id, &input)?;
            let new_invoice = generate(connection, &ctx.store_id, &ctx.user_id, input)?;
            InvoiceRowRepository::new(connection).upsert_one(&new_invoice)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PrescriptionCreated,
                Some(new_invoice.id.to_owned()),
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
        InvoiceRowRepository, NameRow, NameStoreJoinRow, NameType,
    };
    use util::{inline_edit, inline_init};

    use crate::{invoice::prescription::InsertPrescription, service_provider::ServiceProvider};

    use super::InsertPrescriptionError;

    type ServiceError = InsertPrescriptionError;

    #[actix_rt::test]
    async fn insert_prescription_errors() {
        fn not_visible() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_visible".to_string();
            })
        }

        fn not_a_patient() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_a_patient".to_string();
            })
        }

        fn not_a_patient_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "not_a_patient_join".to_string();
                r.name_link_id = not_a_patient().id;
                r.store_id = mock_store_a().id;
                r.name_is_supplier = false;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_prescription_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_patient()];
                r.name_store_joins = vec![not_a_patient_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        //InvoiceAlreadyExists
        assert_eq!(
            service.insert_prescription(
                &context,
                inline_init(|r: &mut InsertPrescription| {
                    r.id.clone_from(&mock_prescription_a().id);
                    r.patient_id.clone_from(&mock_patient().id);
                })
            ),
            Err(ServiceError::InvoiceAlreadyExists)
        );
        // OtherPartyDoesNotExist
        assert_eq!(
            service.insert_prescription(
                &context,
                inline_init(|r: &mut InsertPrescription| {
                    r.id = "new_id".to_string();
                    r.patient_id = "invalid".to_string();
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.insert_prescription(
                &context,
                inline_init(|r: &mut InsertPrescription| {
                    r.id = "new_id".to_string();
                    r.patient_id = not_visible().id;
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotAPatient
        assert_eq!(
            service.insert_prescription(
                &context,
                inline_init(|r: &mut InsertPrescription| {
                    r.id = "new_id".to_string();
                    r.patient_id = not_a_patient().id;
                })
            ),
            Err(ServiceError::OtherPartyNotAPatient)
        );
    }

    #[actix_rt::test]
    async fn insert_prescription_success() {
        fn patient() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "patient".to_string();
                r.r#type = NameType::Patient;
            })
        }

        fn patient_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "patient_join".to_string();
                r.name_link_id = patient().id;
                r.store_id = mock_store_a().id;
                r.name_is_customer = true;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_prescription_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![patient()];
                r.name_store_joins = vec![patient_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Success
        service
            .insert_prescription(
                &context,
                inline_init(|r: &mut InsertPrescription| {
                    r.id = "new_id".to_string();
                    r.patient_id = patient().id;
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_id")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.name_link_id = patient().id;
                u.user_id = Some(mock_user_account_a().id);
                u
            })
        );
    }
}
