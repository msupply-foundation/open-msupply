use repository::{
    EqualFilter, PaginationOption, PeriodFilter, PeriodRepository, PeriodRow, ProgramFilter,
    ProgramRepository, ProgramRequisitionSettingsRowRepository, ProgramRow, ProgramSort,
    RepositoryError, StorageConnection,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult, SingleRecordError};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_programs(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<ProgramFilter>,
    sort: Option<ProgramSort>,
) -> Result<ListResult<ProgramRow>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = ProgramRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_program(
    connection: &StorageConnection,
    id: String,
) -> Result<ProgramRow, SingleRecordError> {
    let repository = ProgramRepository::new(connection);

    let mut result =
        repository.query_by_filter(ProgramFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

pub fn get_periods(
    connection: &StorageConnection,
    store_id: String,
    program_id: Option<String>,
) -> Result<ListResult<PeriodRow>, ListError> {
    let periods = if let Some(program_id) = program_id {
        let period_schedule_ids = ProgramRequisitionSettingsRowRepository::new(connection)
            .find_many_by_program_id(&program_id)?
            .iter()
            .map(|settings| settings.period_schedule_id.clone())
            .collect::<Vec<String>>();

        PeriodRepository::new(connection)
            .query_by_filter(
                store_id,
                None,
                PeriodFilter::new().period_schedule_id(EqualFilter::equal_any(period_schedule_ids)),
            )?
            .iter()
            .map(|period| period.period_row.clone())
            .collect::<Vec<PeriodRow>>()
    } else {
        PeriodRepository::new(connection)
            .query_by_filter(store_id, None, PeriodFilter::new())?
            .iter()
            .map(|period| period.period_row.clone())
            .collect::<Vec<PeriodRow>>()
    };

    Ok(ListResult {
        rows: periods.clone(),
        count: periods.len() as u32,
    })
}
