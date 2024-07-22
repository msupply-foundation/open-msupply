use crate::{
    activity_log::activity_log_entry,
    service_provider::ServiceContext,
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};

use chrono::Utc;
use repository::{
    ActivityLogType, ProgramRequisitionSettingsRowRepository, RepositoryError, RnRForm, RnRFormRow,
    RnRFormRowRepository, RnRFormStatus, StorageConnection,
};

use super::{
    query::get_rnr_form,
    validate::{
        check_period_exists, check_program_exists, check_rnr_form_does_not_exist,
        check_rnr_form_exists_for_period,
    },
};
#[derive(Default, Debug, PartialEq, Clone)]
pub struct InsertRnRForm {
    pub id: String,
    pub supplier_id: String,
    pub program_id: String,
    pub period_id: String,
}

#[derive(Debug, PartialEq)]
pub enum InsertRnRFormError {
    DatabaseError(RepositoryError),
    InternalError(String),
    RnRFormAlreadyExists,
    SupplierDoesNotExist,
    SupplierNotVisible,
    NotASupplier,
    ProgramDoesNotExist,
    PeriodDoesNotExist,
    PeriodNotInProgramSchedule,
    RnRFormAlreadyExistsForPeriod,
    NewlyCreatedRnRFormDoesNotExist,
}

pub fn insert_rnr_form(
    ctx: &ServiceContext,
    input: InsertRnRForm,
) -> Result<RnRForm, InsertRnRFormError> {
    let rnr_form = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;

            let rnr_form = generate(input, &ctx.store_id);

            let rnr_form_repo = RnRFormRowRepository::new(connection);

            rnr_form_repo.upsert_one(&rnr_form)?;

            activity_log_entry(
                ctx,
                ActivityLogType::RnrFormCreated,
                Some(rnr_form.id.clone()),
                None,
                None,
            )?;

            get_rnr_form(ctx, rnr_form.id)
                .map_err(InsertRnRFormError::DatabaseError)?
                .ok_or(InsertRnRFormError::NewlyCreatedRnRFormDoesNotExist)
        })
        .map_err(|err| err.to_inner_error())?;

    Ok(rnr_form)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertRnRForm,
) -> Result<(), InsertRnRFormError> {
    if !check_rnr_form_does_not_exist(connection, &input.id)? {
        return Err(InsertRnRFormError::RnRFormAlreadyExists);
    }

    check_other_party(
        connection,
        store_id,
        &input.supplier_id,
        CheckOtherPartyType::Supplier,
    )?;

    if check_program_exists(connection, &input.program_id)?.is_none() {
        return Err(InsertRnRFormError::ProgramDoesNotExist);
    }

    let period = match check_period_exists(connection, &input.period_id)? {
        Some(period) => period,
        None => {
            return Err(InsertRnRFormError::PeriodDoesNotExist);
        }
    };

    let period_schedule_ids = ProgramRequisitionSettingsRowRepository::new(connection)
        .find_many_by_program_id(&input.program_id)?
        .iter()
        .map(|s| s.period_schedule_id.clone())
        .collect::<Vec<String>>();

    if !period_schedule_ids.contains(&period.period_schedule_id) {
        return Err(InsertRnRFormError::PeriodNotInProgramSchedule);
    }

    if check_rnr_form_exists_for_period(connection, &input.period_id, &input.program_id)?.is_some()
    {
        return Err(InsertRnRFormError::RnRFormAlreadyExistsForPeriod);
    };

    Ok(())
}

fn generate(
    InsertRnRForm {
        id,
        supplier_id,
        program_id,
        period_id,
    }: InsertRnRForm,
    store_id: &str,
) -> RnRFormRow {
    let current_datetime = Utc::now().naive_utc();

    RnRFormRow {
        id,
        period_id,
        program_id,
        name_link_id: supplier_id,
        created_datetime: current_datetime,
        store_id: store_id.to_string(),
        // default
        finalised_datetime: None,
        status: RnRFormStatus::Draft,
        linked_requisition_id: None,
    }
}

impl From<RepositoryError> for InsertRnRFormError {
    fn from(error: RepositoryError) -> Self {
        InsertRnRFormError::DatabaseError(error)
    }
}

impl From<OtherPartyErrors> for InsertRnRFormError {
    fn from(error: OtherPartyErrors) -> Self {
        match error {
            OtherPartyErrors::OtherPartyDoesNotExist => InsertRnRFormError::SupplierDoesNotExist,
            OtherPartyErrors::OtherPartyNotVisible => InsertRnRFormError::SupplierNotVisible,
            OtherPartyErrors::TypeMismatched => InsertRnRFormError::NotASupplier,
            OtherPartyErrors::DatabaseError(err) => InsertRnRFormError::DatabaseError(err),
        }
    }
}
