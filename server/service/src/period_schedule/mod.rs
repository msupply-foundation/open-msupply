use crate::service_provider::ServiceContext;

use repository::{
    Pagination, Period, PeriodFilter, PeriodRepository, PeriodScheduleRepository,
    PeriodScheduleRow, PeriodScheduleSort, PeriodScheduleSortField, PeriodSort, PeriodSortField,
    RepositoryError,
};

#[cfg(test)]
mod tests;

#[derive(Debug)]
pub struct PeriodSchedule {
    pub schedule_row: PeriodScheduleRow,
    pub periods: Vec<Period>,
}

pub fn get_period_schedules(
    ctx: &ServiceContext,
    store_id: &str,
    period_filter: Option<PeriodFilter>,
) -> Result<Vec<PeriodSchedule>, RepositoryError> {
    let schedules = PeriodScheduleRepository::new(&ctx.connection).query(
        None,
        Some(PeriodScheduleSort {
            key: PeriodScheduleSortField::Name,
            desc: None,
        }),
    )?;

    let periods = PeriodRepository::new(&ctx.connection).query(
        store_id.to_string(),
        None,
        Pagination::all(),
        period_filter,
        Some(PeriodSort {
            key: PeriodSortField::EndDate,
            desc: Some(false),
        }),
    )?;

    Ok(schedules
        .into_iter()
        .map(|schedule_row| {
            let periods = periods
                .iter()
                .filter(|period| period.period_row.period_schedule_id == schedule_row.id)
                .cloned()
                .collect();

            PeriodSchedule {
                schedule_row,
                periods,
            }
        })
        .collect())
}
