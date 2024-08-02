use crate::{service_provider::ServiceContext, ListError, ListResult};

use repository::{
    PaginationOption, PeriodRow, RepositoryError, RnRForm, RnRFormFilter, RnRFormSort,
};

use self::finalise::{finalise_rnr_form, FinaliseRnRForm, FinaliseRnRFormError};
use self::insert::{insert_rnr_form, InsertRnRForm, InsertRnRFormError};
use self::query::{get_rnr_form, get_rnr_forms};
use self::schedules_with_periods::{get_schedules_with_periods_by_program, PeriodSchedule};
use self::update::{update_rnr_form, UpdateRnRForm, UpdateRnRFormError};

pub mod finalise;
mod generate_rnr_form_lines;
pub mod insert;
pub mod query;
pub mod schedules_with_periods;
mod tests;
pub mod update;
mod validate;

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
        store_id: &str,
        rnr_form_id: String,
    ) -> Result<Option<RnRForm>, RepositoryError> {
        get_rnr_form(ctx, store_id, rnr_form_id)
    }

    fn get_schedules_with_periods_by_program(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        program_id: &str,
    ) -> Result<Vec<PeriodSchedule>, RepositoryError> {
        get_schedules_with_periods_by_program(ctx, store_id, program_id)
    }

    fn insert_rnr_form(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertRnRForm,
    ) -> Result<RnRForm, InsertRnRFormError> {
        insert_rnr_form(ctx, store_id, input)
    }

    fn update_rnr_form(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateRnRForm,
    ) -> Result<RnRForm, UpdateRnRFormError> {
        update_rnr_form(ctx, store_id, input)
    }

    fn finalise_rnr_form(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: FinaliseRnRForm,
    ) -> Result<RnRForm, FinaliseRnRFormError> {
        finalise_rnr_form(ctx, store_id, input)
    }
}

pub struct RnRFormService;
impl RnRFormServiceTrait for RnRFormService {}

pub fn get_period_length(period: &PeriodRow) -> i64 {
    period
        .end_date
        .signed_duration_since(period.start_date)
        .num_days()
        + 1 // To be inclusive of end date
}
