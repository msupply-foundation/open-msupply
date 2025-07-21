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
                RnRFormLineFilter::new().rnr_form_id(EqualFilter::equal_to(&input.id)),
            )?;

            for line in lines {
                RnRFormLineRowRepository::new(connection)
                    .delete(&line.rnr_form_line_row.id)
                    .map_err(OutError::DatabaseError)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::RnrFormDeleted,
                Some(input.id.to_owned()),
                None,
                None,
            )?;

            match RnRFormRowRepository::new(connection).delete(&input.id) {
                Ok(_) => Ok(input.id.clone()),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
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
