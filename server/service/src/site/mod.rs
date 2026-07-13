use self::{
    assign_stores::{assign_stores_to_site, AssignStoresToSite, AssignStoresToSiteError},
    clear_token::{clear_site_token, ClearSiteTokenError},
    delete::{delete_site, DeleteSiteError},
    query::get_sites,
    set_multi_device::{set_site_multi_device, SetSiteMultiDeviceError},
    upsert::{upsert_site, UpsertSite, UpsertSiteError},
};
use crate::{
    service_provider::ServiceContext,
    site::clear_hardware_id::{clear_site_hardware_id, ClearSiteHardwareIdError},
    ListError, ListResult,
};
use repository::{PaginationOption, SiteFilter, SiteRow, SiteSort};

pub mod assign_stores;
pub mod clear_hardware_id;
pub mod clear_token;
pub mod delete;
pub mod query;
pub mod set_multi_device;
pub mod sync_metadata;
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

    fn clear_site_token(
        &self,
        ctx: &ServiceContext,
        site_id: i32,
    ) -> Result<i32, ClearSiteTokenError> {
        clear_site_token(ctx, site_id)
    }

    fn set_site_multi_device(
        &self,
        ctx: &ServiceContext,
        site_id: i32,
        is_multi_device: bool,
    ) -> Result<i32, SetSiteMultiDeviceError> {
        set_site_multi_device(ctx, site_id, is_multi_device)
    }

    /// Clears the `hardware_id` for a `Site` whose id is `site_id`.
    /// Sets the field to `NULL`` in the underlying `site` table
    fn clear_site_hardware_id(
        &self,
        ctx: &ServiceContext,
        site_id: i32,
    ) -> Result<i32, ClearSiteHardwareIdError> {
        clear_site_hardware_id(ctx, site_id)
    }
}

pub struct SiteService {}
impl SiteServiceTrait for SiteService {}
