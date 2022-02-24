use repository::PaginationOption;
use repository::{schema::StoreRow, StoreFilter, StoreRepository, StoreSort};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub trait StoreServiceTrait: Sync + Send {
    fn get_stores(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<StoreFilter>,
        sort: Option<StoreSort>,
    ) -> Result<ListResult<StoreRow>, ListError> {
        let pagination = get_default_pagination(pagination, u32::MAX, 1)?;
        let repository = StoreRepository::new(&ctx.connection);

        Ok(ListResult {
            rows: repository.query(pagination, filter.clone(), sort)?,
            count: i64_to_u32(repository.count(filter)?),
        })
    }
}

pub struct StoreService;
impl StoreServiceTrait for StoreService {}
