use repository::{
    EqualFilter, MasterListFilter, MasterListRepository, Period, PeriodFilter, PeriodRepository,
    PeriodRow, PeriodRowRepository, RepositoryError, RnRForm, RnRFormFilter, RnRFormRepository,
    StorageConnection,
};

pub fn check_rnr_form_exists(
    connection: &StorageConnection,
    rnr_form_id: &str,
) -> Result<Option<RnRForm>, RepositoryError> {
    RnRFormRepository::new(connection)
        .query_one(RnRFormFilter::new().id(EqualFilter::equal_to(rnr_form_id.to_string())))
}

pub fn check_rnr_form_does_not_exist(
    connection: &StorageConnection,
    rnr_form_id: &str,
) -> Result<bool, RepositoryError> {
    let existing = check_rnr_form_exists(connection, rnr_form_id)?;
    Ok(existing.is_none())
}

pub fn check_period_exists(
    connection: &StorageConnection,
    period_id: &str,
) -> Result<Option<PeriodRow>, RepositoryError> {
    PeriodRowRepository::new(connection).find_one_by_id(period_id)
}

pub fn check_rnr_form_already_exists_for_period(
    connection: &StorageConnection,
    store_id: &str,
    period_id: &str,
    program_id: &str,
) -> Result<Option<Period>, RepositoryError> {
    Ok(PeriodRepository::new(connection)
        .query_by_filter(
            store_id.to_string(),
            Some(program_id.to_string()),
            PeriodFilter::new()
                .id(EqualFilter::equal_to(period_id.to_string()))
                .rnr_form_program_id(EqualFilter::equal_to(program_id.to_string())),
        )?
        .pop())
}

pub fn check_master_list_exists(
    connection: &StorageConnection,
    store_id: &str,
    master_list_id: &str,
) -> Result<bool, RepositoryError> {
    let count = MasterListRepository::new(connection).count(Some(
        MasterListFilter::new()
            .id(EqualFilter::equal_to(master_list_id.to_string()))
            .exists_for_store_id(EqualFilter::equal_to(store_id.to_string())),
    ))?;

    Ok(count > 0)
}
