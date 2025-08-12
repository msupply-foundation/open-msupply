use repository::assets::asset_log::{AssetLog, AssetLogFilter, AssetLogRepository, AssetLogSort};
use repository::{EqualFilter, PaginationOption, StorageConnection};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub fn get_asset_logs(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<AssetLogFilter>,
    sort: Option<AssetLogSort>,
) -> Result<ListResult<AssetLog>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = AssetLogRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_asset_log(ctx: &ServiceContext, id: String) -> Result<AssetLog, SingleRecordError> {
    let repository = AssetLogRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(AssetLogFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
