use crate::service_provider::ServiceContext;

use chrono::Utc;
use repository::{
    DateFilter, EqualFilter, Period, PeriodFilter, PeriodRepository, PeriodScheduleRow,
    PeriodScheduleRowRepository, PeriodSort, PeriodSortField,
    ProgramRequisitionSettingsRowRepository, RepositoryError,
};

#[derive(Debug)]
pub struct PeriodSchedule {
    pub schedule_row: PeriodScheduleRow,
    pub periods: Vec<Period>,
}

pub fn get_schedules_with_periods_by_program(
    ctx: &ServiceContext,
    program_id: &str,
) -> Result<Vec<PeriodSchedule>, RepositoryError> {
    let settings_repo = ProgramRequisitionSettingsRowRepository::new(&ctx.connection);
    let period_repo = PeriodRepository::new(&ctx.connection);

    let settings = settings_repo.find_many_by_program_id(program_id)?;

    let mut period_schedule_ids = settings
        .iter()
        .map(|s| s.period_schedule_id.clone())
        .collect::<Vec<String>>();

    // There can be duplicates in the program settings due to name tags
    // which we don't care about here, so we dedup here
    period_schedule_ids.sort_unstable();
    period_schedule_ids.dedup();

    let schedules = period_schedule_ids
        .into_iter()
        .map(|schedule_id| {
            let period_filter = PeriodFilter::new()
                .period_schedule_id(EqualFilter::equal_to(&schedule_id))
                .rnr_form_program_id(EqualFilter::equal_any_or_null(vec![program_id.to_string()]))
                .end_date(DateFilter::before_or_equal_to(Utc::now().date_naive()));

            let closed_periods = period_repo.query(
                Some(period_filter),
                Some(PeriodSort {
                    key: PeriodSortField::EndDate,
                    desc: Some(true),
                }),
            )?;

            let schedule_row = PeriodScheduleRowRepository::new(&ctx.connection)
                .find_one_by_id(&schedule_id)?
                .ok_or_else(|| RepositoryError::NotFound)?;

            Ok(PeriodSchedule {
                schedule_row,
                periods: closed_periods,
            })
        })
        .collect::<Result<Vec<PeriodSchedule>, RepositoryError>>();

    schedules
}
