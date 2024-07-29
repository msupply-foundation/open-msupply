use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

use chrono::Utc;
use repository::{
    ActivityLogType, RepositoryError, RnRForm, RnRFormRow, RnRFormRowRepository, RnRFormStatus,
};

use super::{query::get_rnr_form, validate::check_rnr_form_exists};

#[derive(Default, Debug, PartialEq, Clone)]
pub struct FinaliseRnRForm {
    pub id: String,
}

#[derive(Debug, PartialEq)]
pub enum FinaliseRnRFormError {
    DatabaseError(RepositoryError),
    InternalError(String),
    RnRFormDoesNotExist,
    RnRFormAlreadyFinalised,
    FinalisedRnRFormDoesNotExist,
}

pub fn finalise_rnr_form(
    ctx: &ServiceContext,
    store_id: &str,
    input: FinaliseRnRForm,
) -> Result<RnRForm, FinaliseRnRFormError> {
    let rnr_form = ctx
        .connection
        .transaction_sync(|connection| {
            let rnr_form = validate(ctx, &input)?;
            let finalised_form = generate(rnr_form);

            let rnr_form_repo = RnRFormRowRepository::new(connection);

            rnr_form_repo.upsert_one(&finalised_form)?;

            activity_log_entry(
                ctx,
                ActivityLogType::RnrFormFinalised,
                Some(input.id.clone()),
                None,
                None,
            )?;

            get_rnr_form(ctx, store_id, input.id)
                .map_err(FinaliseRnRFormError::DatabaseError)?
                .ok_or(FinaliseRnRFormError::FinalisedRnRFormDoesNotExist)
        })
        .map_err(|err| err.to_inner_error())?;

    Ok(rnr_form)
}

fn validate(
    ctx: &ServiceContext,
    input: &FinaliseRnRForm,
) -> Result<RnRFormRow, FinaliseRnRFormError> {
    let connection = &ctx.connection;

    let rnr_form = check_rnr_form_exists(connection, &input.id)?
        .ok_or(FinaliseRnRFormError::RnRFormDoesNotExist)?;

    if rnr_form.status == RnRFormStatus::Finalised {
        return Err(FinaliseRnRFormError::RnRFormAlreadyFinalised);
    };

    Ok(rnr_form)
}

fn generate(existing_row: RnRFormRow) -> RnRFormRow {
    let current_datetime = Utc::now().naive_utc();

    RnRFormRow {
        finalised_datetime: Some(current_datetime),
        status: RnRFormStatus::Finalised,
        ..existing_row
    }
}

impl From<RepositoryError> for FinaliseRnRFormError {
    fn from(error: RepositoryError) -> Self {
        FinaliseRnRFormError::DatabaseError(error)
    }
}
