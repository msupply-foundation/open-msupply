use repository::{PrescriptionRequestLineRowRepository, RepositoryError, TransactionError};

use crate::prescription_request::validate::{
    check_prescription_request_editable, CommonPrescriptionRequestError,
};
use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq)]
pub enum DeletePrescriptionRequestLineError {
    LineDoesNotExist,
    NotThisStorePrescriptionRequest,
    /// Lines are only deletable while the request is New.
    NotEditable,
    DatabaseError(RepositoryError),
}

pub fn delete_prescription_request_line(
    ctx: &ServiceContext,
    store_id: &str,
    id: String,
) -> Result<String, DeletePrescriptionRequestLineError> {
    use DeletePrescriptionRequestLineError::*;

    ctx.connection
        .transaction_sync(|connection| {
            let repo = PrescriptionRequestLineRowRepository::new(connection);
            let line = repo.find_one_by_id(&id)?.ok_or(LineDoesNotExist)?;

            check_prescription_request_editable(
                connection,
                store_id,
                &line.prescription_request_id,
            )
            .map_err(|error| match error {
                // A line whose parent is gone shouldn't exist; surface as missing line
                CommonPrescriptionRequestError::DoesNotExist => LineDoesNotExist,
                CommonPrescriptionRequestError::NotThisStorePrescriptionRequest => {
                    NotThisStorePrescriptionRequest
                }
                CommonPrescriptionRequestError::NotEditable => NotEditable,
                CommonPrescriptionRequestError::DatabaseError(e) => DatabaseError(e),
            })?;

            repo.delete(&id)?;

            Ok(id.clone())
        })
        .map_err(
            |error: TransactionError<DeletePrescriptionRequestLineError>| error.to_inner_error(),
        )
}

impl From<RepositoryError> for DeletePrescriptionRequestLineError {
    fn from(error: RepositoryError) -> Self {
        DeletePrescriptionRequestLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_item_a, mock_patient, MockDataInserts},
        test_db::setup_all,
        PrescriptionRequestLineRowRepository, PrescriptionRequestRow,
    };
    use util::uuid::uuid;

    use crate::prescription_request::insert::InsertPrescriptionRequest;
    use crate::prescription_request::update::{
        UpdatePrescriptionRequest, UpdatePrescriptionRequestStatus,
    };
    use crate::prescription_request_line::upsert::UpsertPrescriptionRequestLine;
    use crate::service_provider::{ServiceContext, ServiceProvider};

    use super::*;

    async fn setup(test: &str) -> (ServiceProvider, ServiceContext) {
        let (_, _, connection_manager, _) = setup_all(test, MockDataInserts::all()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();
        (service_provider, context)
    }

    fn new_request(
        service_provider: &ServiceProvider,
        ctx: &ServiceContext,
    ) -> PrescriptionRequestRow {
        service_provider
            .prescription_request_service
            .insert_prescription_request(
                ctx,
                "store_a",
                InsertPrescriptionRequest {
                    id: uuid(),
                    patient_id: mock_patient().id,
                    ..Default::default()
                },
            )
            .unwrap()
    }

    fn add_line(
        service_provider: &ServiceProvider,
        ctx: &ServiceContext,
        request_id: &str,
    ) -> String {
        service_provider
            .prescription_request_line_service
            .upsert_prescription_request_line(
                ctx,
                "store_a",
                UpsertPrescriptionRequestLine {
                    id: uuid(),
                    prescription_request_id: request_id.to_string(),
                    item_id: mock_item_a().id,
                    number_of_units: 5.0,
                    note: None,
                },
            )
            .unwrap()
            .id
    }

    #[actix_rt::test]
    async fn delete_prescription_request_line_errors() {
        let (service_provider, ctx) = setup("delete_prescription_request_line_errors").await;
        let service = &service_provider.prescription_request_line_service;
        let request = new_request(&service_provider, &ctx);
        let line_id = add_line(&service_provider, &ctx, &request.id);

        // LineDoesNotExist
        assert_eq!(
            service.delete_prescription_request_line(&ctx, "store_a", "does not exist".to_string()),
            Err(DeletePrescriptionRequestLineError::LineDoesNotExist)
        );

        // NotThisStorePrescriptionRequest
        assert_eq!(
            service.delete_prescription_request_line(&ctx, "store_b", line_id.clone()),
            Err(DeletePrescriptionRequestLineError::NotThisStorePrescriptionRequest)
        );

        // NotEditable — the request has been handed over, so its lines are the
        // record of what was prescribed and cannot be taken back
        service_provider
            .prescription_request_service
            .update_prescription_request(
                &ctx,
                "store_a",
                UpdatePrescriptionRequest {
                    id: request.id.clone(),
                    status: Some(UpdatePrescriptionRequestStatus::ReadyToDispense {
                        clinician_id: None,
                    }),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(
            service.delete_prescription_request_line(&ctx, "store_a", line_id.clone()),
            Err(DeletePrescriptionRequestLineError::NotEditable)
        );
        // ...and it is still there
        assert!(PrescriptionRequestLineRowRepository::new(&ctx.connection)
            .find_one_by_id(&line_id)
            .unwrap()
            .is_some());
    }

    #[actix_rt::test]
    async fn delete_prescription_request_line_success() {
        let (service_provider, ctx) = setup("delete_prescription_request_line_success").await;
        let service = &service_provider.prescription_request_line_service;
        let request = new_request(&service_provider, &ctx);
        let line_id = add_line(&service_provider, &ctx, &request.id);
        let kept_line_id = add_line(&service_provider, &ctx, &request.id);

        assert_eq!(
            service.delete_prescription_request_line(&ctx, "store_a", line_id.clone()),
            Ok(line_id.clone())
        );

        let repo = PrescriptionRequestLineRowRepository::new(&ctx.connection);
        assert_eq!(repo.find_one_by_id(&line_id).unwrap(), None);
        // The request itself, and its other lines, are untouched
        assert!(repo.find_one_by_id(&kept_line_id).unwrap().is_some());
        assert!(service_provider
            .prescription_request_service
            .get_prescription_request(&ctx, Some("store_a"), &request.id)
            .unwrap()
            .is_some());
    }
}
