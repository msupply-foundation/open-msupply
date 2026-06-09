use repository::{
    PaginationOption, PluginData, PluginDataFilter, PluginDataRepository, PluginDataSort,
    RepositoryError,
};

use crate::i64_to_u32;
use crate::service_provider::ServiceContext;
use crate::{get_default_pagination_unlimited, ListResult};
mod insert;
pub use self::insert::*;
mod update;
pub use self::update::*;
mod delete;
pub use self::delete::*;

pub trait PluginDataServiceTrait: Sync + Send {
    fn get_plugin_data(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<PluginDataFilter>,
        sort: Option<PluginDataSort>,
    ) -> Result<ListResult<PluginData>, RepositoryError> {
        let pagination = get_default_pagination_unlimited(pagination);
        let repository = PluginDataRepository::new(&ctx.connection);

        Ok(ListResult {
            rows: repository.query(pagination, filter.clone(), sort)?,
            count: i64_to_u32(repository.count(filter)?),
        })
    }

    fn insert(
        &self,
        ctx: &ServiceContext,
        input: InsertPluginData,
    ) -> Result<PluginData, InsertPluginDataError> {
        insert(ctx, input)
    }

    fn update(
        &self,
        ctx: &ServiceContext,
        input: UpdatePluginData,
    ) -> Result<PluginData, UpdatePluginDataError> {
        update(ctx, input)
    }

    fn delete(&self, ctx: &ServiceContext, id: &str) -> Result<String, DeletePluginDataError> {
        delete(ctx, id)
    }
}

pub struct PluginDataService {}
impl PluginDataServiceTrait for PluginDataService {}
