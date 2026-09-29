use crate::{i64_to_u32, ListResult};

use repository::{
    PeriodScheduleFilter, PeriodScheduleRepository, PeriodScheduleRow, PeriodScheduleSort,
    PeriodScheduleSortField, RepositoryError, StorageConnection,
};

#[cfg(test)]
mod tests;

pub fn get_period_schedules(
    connection: &StorageConnection,
    filter: Option<PeriodScheduleFilter>,
) -> Result<ListResult<PeriodScheduleRow>, RepositoryError> {
    let repository = PeriodScheduleRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(
            filter.clone(),
            Some(PeriodScheduleSort {
                key: PeriodScheduleSortField::Name,
                desc: None,
            }),
        )?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
