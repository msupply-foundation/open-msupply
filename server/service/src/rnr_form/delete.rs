use crate::{
    activity_log::activity_log_entry, rnr_form::validate::check_rnr_form_exists,
    service_provider::ServiceContext,
};
use repository::{
    ActivityLogType, EqualFilter, RepositoryError, RnRFormLineFilter, RnRFormLineRepository,
    RnRFormLineRowRepository, RnRFormRowRepository, RnRFormStatus, StorageConnection,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct DeleteRnRForm {
    pub id: String,
}

#[derive(Debug, PartialEq)]

pub enum DeleteRnRFormError {
    RnRFormDoesNotExist,
    NotThisStoreRnRForm,
    CannotEditRnRForm,
    DatabaseError(RepositoryError),
}

type OutError = DeleteRnRFormError;

pub fn delete_rnr_form(ctx: &ServiceContext, input: DeleteRnRForm) -> Result<String, OutError> {
    let requisition_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;

            let lines = RnRFormLineRepository::new(connection).query_by_filter(
                RnRFormLineFilter::new().rnr_form_id(EqualFilter::equal_to(input.id.to_string())),
            )?;

            for line in lines {
                RnRFormLineRowRepository::new(connection)
                    .delete(&line.rnr_form_line_row.id)
                    .map_err(OutError::DatabaseError)?;
            }

            let delete_line_id = match RnRFormRowRepository::new(connection).delete(&input.id) {
                Ok(_) => input.id.clone(),
                Err(error) => return Err(OutError::DatabaseError(error)),
            };

            activity_log_entry(
                ctx,
                ActivityLogType::RnrFormDeleted,
                Some(delete_line_id.clone()),
                None,
                None,
            )?;

            Ok(delete_line_id)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(requisition_id)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteRnRForm,
) -> Result<(), OutError> {
    let rnr_form =
        check_rnr_form_exists(connection, &input.id)?.ok_or(OutError::RnRFormDoesNotExist)?;

    if rnr_form.rnr_form_row.store_id != store_id {
        return Err(OutError::NotThisStoreRnRForm);
    }

    if rnr_form.rnr_form_row.status != RnRFormStatus::Draft {
        return Err(OutError::CannotEditRnRForm);
    }

    Ok(())
}

impl From<RepositoryError> for DeleteRnRFormError {
    fn from(error: RepositoryError) -> Self {
        DeleteRnRFormError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_delete {
    use crate::{
        rnr_form::delete::{DeleteRnRForm, DeleteRnRFormError as ServiceError},
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{mock_rnr_form_a, mock_rnr_form_b, mock_store_a, mock_store_b, MockDataInserts},
        test_db::setup_all,
        RequisitionRowRepository,
    };

    #[actix_rt::test]
    async fn delete_rnr_form_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_rnr_form_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.rnr_form_service;

        assert_eq!(
            service.delete_rnr_form(
                &context,
                DeleteRnRForm {
                    id: "invalid".to_string(),
                },
            ),
            Err(ServiceError::RnRFormDoesNotExist)
        );

        assert_eq!(
            service.delete_rnr_form(
                &context,
                DeleteRnRForm {
                    id: mock_rnr_form_a().id,
                },
            ),
            Err(ServiceError::CannotEditRnRForm)
        );

        context.store_id = mock_store_b().id;
        assert_eq!(
            service.delete_rnr_form(
                &context,
                DeleteRnRForm {
                    id: mock_rnr_form_b().id,
                },
            ),
            Err(ServiceError::NotThisStoreRnRForm)
        );
    }

    #[actix_rt::test]
    async fn delete_rnr_form_success() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_rnr_form_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.rnr_form_service;

        let result = service
            .delete_rnr_form(
                &context,
                DeleteRnRForm {
                    id: mock_rnr_form_b().id,
                },
            )
            .unwrap();

        assert_eq!(
            RequisitionRowRepository::new(&connection)
                .find_one_by_id(&result)
                .unwrap(),
            None
        )
    }
}
