use crate::{service_provider::ServiceContext, ListError, ListResult};

use chrono::Utc;
use repository::{
    DateFilter, EqualFilter, PaginationOption, Period, PeriodFilter, PeriodRepository,
    PeriodScheduleRow, PeriodScheduleRowRepository, PeriodSort, PeriodSortField,
    ProgramRequisitionSettingsRowRepository, RepositoryError, RnRForm, RnRFormFilter, RnRFormSort,
};

use self::query::{get_rnr_form, get_rnr_forms};

pub mod query;
mod tests;

pub struct X {
    pub period_schedule: PeriodScheduleRow,
    pub periods: Vec<Period>,
}

pub trait RnRFormServiceTrait: Sync + Send {
    fn get_rnr_forms(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<RnRFormFilter>,
        sort: Option<RnRFormSort>,
    ) -> Result<ListResult<RnRForm>, ListError> {
        get_rnr_forms(ctx, store_id, pagination, filter, sort)
    }

    fn get_rnr_form(
        &self,
        ctx: &ServiceContext,
        rnr_form_id: String,
    ) -> Result<Option<RnRForm>, RepositoryError> {
        get_rnr_form(ctx, rnr_form_id)
    }

    fn get_schedules_with_periods_by_program(
        &self,
        ctx: &ServiceContext,
        program_id: &str,
    ) -> Result<Vec<X>, RepositoryError> {
        // STEPS
        let settings_repo = ProgramRequisitionSettingsRowRepository::new(&ctx.connection);
        let period_repo = PeriodRepository::new(&ctx.connection);

        let settings = settings_repo.find_many_by_program_id(program_id)?;

        let period_schedule_ids = settings
            .iter()
            .map(|s| s.period_schedule_id.clone())
            .collect::<Vec<String>>();

        // TODO: no period schedules for program

        let schedules = period_schedule_ids
            .into_iter()
            .map(|schedule_id| {
                let period_filter = PeriodFilter::new()
                    .period_schedule_id(EqualFilter::equal_to(&schedule_id))
                    .rnr_form_program_id(EqualFilter::equal_any_or_null(vec![
                        program_id.to_string()
                    ]))
                    .end_date(DateFilter::before_or_equal_to(Utc::now().date_naive()));

                let closed_periods = period_repo.query(
                    Some(period_filter),
                    Some(PeriodSort {
                        key: PeriodSortField::EndDate,
                        desc: None,
                    }),
                )?;

                let schedule_row = PeriodScheduleRowRepository::new(&ctx.connection)
                    .find_one_by_id(&schedule_id)?
                    .ok_or_else(|| RepositoryError::NotFound)?;

                Ok(X {
                    period_schedule: schedule_row,
                    periods: closed_periods,
                })
            })
            .collect::<Result<Vec<X>, RepositoryError>>();

        schedules
    }
}

pub struct RnRFormService;
impl RnRFormServiceTrait for RnRFormService {}
