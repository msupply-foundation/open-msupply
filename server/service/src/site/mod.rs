use self::query::get_sites;
use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{PaginationOption, SiteFilter, SiteRow, SiteSort};

pub mod query;
pub mod upsert;

pub trait SiteServiceTrait: Sync + Send {
    fn get_sites(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<SiteFilter>,
        sort: Option<SiteSort>,
    ) -> Result<ListResult<SiteRow>, ListError> {
        get_sites(ctx, pagination, filter, sort)
    }
}

pub struct SiteService {}
impl SiteServiceTrait for SiteService {}
