use repository::{
    EqualFilter, Period, PeriodFilter, PeriodRepository, PeriodRow, PeriodRowRepository,
    ProgramRow, ProgramRowRepository, RepositoryError, RnRFormRow, RnRFormRowRepository,
    StorageConnection,
};

pub fn check_rnr_form_exists(
    connection: &StorageConnection,
    rnr_form_id: &str,
) -> Result<Option<RnRFormRow>, RepositoryError> {
    RnRFormRowRepository::new(connection).find_one_by_id(rnr_form_id)
}

pub fn check_rnr_form_does_not_exist(
    connection: &StorageConnection,
    rnr_form_id: &str,
) -> Result<bool, RepositoryError> {
    let existing = check_rnr_form_exists(connection, rnr_form_id)?;
    Ok(existing.is_none())
}

pub fn check_program_exists(
    connection: &StorageConnection,
    program_id: &str,
) -> Result<Option<ProgramRow>, RepositoryError> {
    ProgramRowRepository::new(connection).find_one_by_id(program_id)
}

pub fn check_period_exists(
    connection: &StorageConnection,
    period_id: &str,
) -> Result<Option<PeriodRow>, RepositoryError> {
    PeriodRowRepository::new(connection).find_one_by_id(period_id)
}

pub fn check_rnr_form_exists_for_period(
    connection: &StorageConnection,
    store_id: &str,
    period_id: &str,
    program_id: &str,
) -> Result<Option<Period>, RepositoryError> {
    Ok(PeriodRepository::new(connection)
        .query_by_filter(
            store_id.to_string(),
            program_id.to_string(),
            PeriodFilter::new()
                .id(EqualFilter::equal_to(period_id))
                .rnr_form_program_id(EqualFilter::equal_to(program_id)),
        )?
        .pop())
}
