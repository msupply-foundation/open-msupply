use self::{
    assign_stores::{assign_stores_to_site, AssignStoresToSite, AssignStoresToSiteError},
    delete::{delete_site, DeleteSiteError},
    query::get_sites,
    upsert::{upsert_site, UpsertSite, UpsertSiteError},
};
use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{PaginationOption, SiteFilter, SiteRow, SiteSort};

pub mod assign_stores;
pub mod delete;
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

    fn upsert_site(
        &self,
        ctx: &ServiceContext,
        input: UpsertSite,
    ) -> Result<SiteRow, UpsertSiteError> {
        upsert_site(ctx, input)
    }

    fn delete_site(&self, ctx: &ServiceContext, site_id: i32) -> Result<i32, DeleteSiteError> {
        delete_site(ctx, site_id)
    }

    fn assign_stores_to_site(
        &self,
        ctx: &ServiceContext,
        input: AssignStoresToSite,
    ) -> Result<Vec<String>, AssignStoresToSiteError> {
        assign_stores_to_site(ctx, input)
    }
}

pub struct SiteService {}
impl SiteServiceTrait for SiteService {}
