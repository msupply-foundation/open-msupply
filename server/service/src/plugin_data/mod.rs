use repository::{
    Pagination, PluginData, PluginDataFilter, PluginDataRepository, PluginDataSort, RepositoryError,
};

use crate::i64_to_u32;
use crate::service_provider::ServiceContext;
use crate::ListResult;
mod insert;
pub use self::insert::*;
mod update;
pub use self::update::*;

pub trait PluginDataServiceTrait: Sync + Send {
    fn get_plugin_data(
        &self,
        ctx: &ServiceContext,
        filter: Option<PluginDataFilter>,
        sort: Option<PluginDataSort>,
    ) -> Result<ListResult<PluginData>, RepositoryError> {
        let repository = PluginDataRepository::new(&ctx.connection);

        Ok(ListResult {
            rows: repository.query(Pagination::new(), filter.clone(), sort)?,
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
}

pub struct PluginDataService {}
impl PluginDataServiceTrait for PluginDataService {}
