use self::finalise::{FinaliseRnRForm, FinaliseRnRFormError, finalise_rnr_form};
use self::insert::{InsertRnRForm, InsertRnRFormError, insert_rnr_form};
use self::query::{get_rnr_form, get_rnr_forms};
use self::schedules_with_periods::{PeriodSchedule, get_schedules_with_periods_by_program};
use self::update::{UpdateRnRForm, UpdateRnRFormError, update_rnr_form};
use crate::rnr_form::delete::{DeleteRnRForm, DeleteRnRFormError, delete_rnr_form};
use crate::{ListError, ListResult, service_provider::ServiceContext};
use repository::{
    PaginationOption, PeriodRow, RepositoryError, RnRForm, RnRFormFilter, RnRFormSort,
};

pub mod delete;
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

    fn delete_rnr_form(
        &self,
        ctx: &ServiceContext,
        input: DeleteRnRForm,
    ) -> Result<String, DeleteRnRFormError> {
        delete_rnr_form(ctx, input)
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
