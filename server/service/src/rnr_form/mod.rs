use crate::{service_provider::ServiceContext, ListError, ListResult};

use repository::{PaginationOption, RepositoryError, RnRForm, RnRFormFilter, RnRFormSort};

use self::query::{get_rnr_form, get_rnr_forms};

pub mod query;

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
}

pub struct RnRFormService;
impl RnRFormServiceTrait for RnRFormService {}
