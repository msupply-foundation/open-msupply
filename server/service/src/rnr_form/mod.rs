use crate::{service_provider::ServiceContext, ListError, ListResult};

use repository::{PaginationOption, RepositoryError, RnRForm, RnRFormFilter, RnRFormSort};

use self::query::{get_rnr_form, get_rnr_forms};
use self::schedules_with_periods::{get_schedules_with_periods_by_program, PeriodSchedule};

pub mod query;
pub mod schedules_with_periods;
mod tests;

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
    ) -> Result<Vec<PeriodSchedule>, RepositoryError> {
        get_schedules_with_periods_by_program(ctx, program_id)
    }
}

pub struct RnRFormService;
impl RnRFormServiceTrait for RnRFormService {}
