use crate::{
    activity_log::activity_log_entry,
    service_provider::ServiceContext,
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};

use chrono::Utc;
use repository::{
    ActivityLogType, EqualFilter, PeriodRow, RepositoryError, RnRForm, RnRFormFilter,
    RnRFormLineRow, RnRFormLineRowRepository, RnRFormRepository, RnRFormRow, RnRFormRowRepository,
    RnRFormStatus,
};

use super::{
    generate_rnr_form_lines::generate_rnr_form_lines,
    query::get_rnr_form,
    schedules_with_periods::get_schedules_with_periods_by_program,
    validate::{
        check_master_list_exists, check_period_exists, check_program_exists,
        check_rnr_form_already_exists_for_period, check_rnr_form_does_not_exist,
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
    ProgramHasNoMasterList,
    PeriodDoesNotExist,
    PeriodNotInProgramSchedule,
    PeriodNotNextInSequence,
    PeriodNotClosed,
    PreviousRnRFormNotFinalised,
    RnRFormAlreadyExistsForPeriod,
    NewlyCreatedRnRFormDoesNotExist,
}

pub fn insert_rnr_form(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertRnRForm,
) -> Result<RnRForm, InsertRnRFormError> {
    let rnr_form = ctx
        .connection
        .transaction_sync(|connection| {
            let (previous_rnr_form, period_row, master_list_id) = validate(ctx, store_id, &input)?;
            let (rnr_form, rnr_form_lines) =
                generate(ctx, input, previous_rnr_form, period_row, &master_list_id)?;

            let rnr_form_repo = RnRFormRowRepository::new(connection);
            let rnr_form_line_repo = RnRFormLineRowRepository::new(connection);

            rnr_form_repo.upsert_one(&rnr_form)?;

            for line in rnr_form_lines {
                rnr_form_line_repo.upsert_one(&line)?;
            }

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
    ctx: &ServiceContext,
    store_id: &str,
    input: &InsertRnRForm,
) -> Result<(Option<RnRForm>, PeriodRow, String), InsertRnRFormError> {
    let connection = &ctx.connection;

    if !check_rnr_form_does_not_exist(connection, &input.id)? {
        return Err(InsertRnRFormError::RnRFormAlreadyExists);
    }

    check_other_party(
        connection,
        store_id,
        &input.supplier_id,
        CheckOtherPartyType::Supplier,
    )?;

    // TODO... for store! How?
    let program = check_program_exists(connection, &input.program_id)?
        .ok_or(InsertRnRFormError::ProgramDoesNotExist)?;

    let master_list_id = match program.master_list_id {
        Some(id) => id,
        None => return Err(InsertRnRFormError::ProgramHasNoMasterList),
    };

    if !check_master_list_exists(connection, store_id, &master_list_id)? {
        return Err(InsertRnRFormError::ProgramHasNoMasterList);
    }

    let period = check_period_exists(connection, &input.period_id)?
        .ok_or(InsertRnRFormError::PeriodDoesNotExist)?;

    if period.end_date > Utc::now().naive_utc().into() {
        return Err(InsertRnRFormError::PeriodNotClosed);
    }

    let schedules = get_schedules_with_periods_by_program(ctx, store_id, &input.program_id)?;

    // Check if period is part of one of the period schedules for the program
    let schedule = schedules
        .iter()
        .find(|s| s.schedule_row.id == period.period_schedule_id)
        .ok_or(InsertRnRFormError::PeriodNotInProgramSchedule)?;

    if check_rnr_form_already_exists_for_period(
        connection,
        store_id,
        &input.period_id,
        &input.program_id,
    )?
    .is_some()
    {
        return Err(InsertRnRFormError::RnRFormAlreadyExistsForPeriod);
    };

    // Query one, as query sorts by created date, will return latest // tODO double check
    let most_recent_form = RnRFormRepository::new(&ctx.connection).query_one(
        RnRFormFilter::new()
            .store_id(EqualFilter::equal_to(&ctx.store_id))
            .program_id(EqualFilter::equal_to(&input.program_id))
            .period_schedule_id(EqualFilter::equal_to(&period.period_schedule_id)),
    )?;

    if let Some(form) = most_recent_form.clone() {
        let previous_period = schedule
            .periods
            .iter()
            .position(|p| p.period_row.id == form.period_row.id)
            // this should never happen, we've already checked it's there
            .ok_or(InsertRnRFormError::PeriodNotInProgramSchedule)?;

        let this_period = schedule
            .periods
            .iter()
            .position(|p| p.period_row.id == period.id)
            // this should never happen, we've already checked it's there
            .ok_or(InsertRnRFormError::PeriodNotInProgramSchedule)?;

        if previous_period != this_period + 1 {
            return Err(InsertRnRFormError::PeriodNotNextInSequence);
        }

        if form.rnr_form_row.status != RnRFormStatus::Finalised {
            return Err(InsertRnRFormError::PreviousRnRFormNotFinalised);
        }
    }

    Ok((most_recent_form, period, master_list_id))
}

fn generate(
    ctx: &ServiceContext,
    InsertRnRForm {
        id,
        supplier_id,
        program_id,
        period_id,
    }: InsertRnRForm,
    previous_rnr_form: Option<RnRForm>,
    period: PeriodRow,
    master_list_id: &str,
) -> Result<(RnRFormRow, Vec<RnRFormLineRow>), RepositoryError> {
    let current_datetime = Utc::now().naive_utc();

    let rnr_form = RnRFormRow {
        id,
        period_id,
        program_id,
        name_link_id: supplier_id,
        created_datetime: current_datetime,
        store_id: ctx.store_id.clone(),
        // default
        finalised_datetime: None,
        status: RnRFormStatus::Draft,
        linked_requisition_id: None,
    };

    let rnr_form_lines = generate_rnr_form_lines(
        ctx,
        &ctx.store_id,
        &rnr_form.id,
        master_list_id,
        period,
        previous_rnr_form,
    )?;

    Ok((rnr_form, rnr_form_lines))
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
