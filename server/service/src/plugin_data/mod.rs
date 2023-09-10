use repository::{
    Pagination, PluginData, PluginDataFilter, PluginDataRepository, PluginDataSort, RepositoryError,
};

use crate::service_provider::ServiceContext;
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
    ) -> Result<Option<PluginData>, RepositoryError> {
        Ok(PluginDataRepository::new(&ctx.connection)
            .query(Pagination::new(), filter, sort)?
            .pop())
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
