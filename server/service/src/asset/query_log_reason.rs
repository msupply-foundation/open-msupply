use repository::asset_log_reason::{
    AssetLogReason, AssetLogReasonFilter, AssetLogReasonRepository, AssetLogReasonSort,
};

use repository::{EqualFilter, PaginationOption, StorageConnection};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_asset_log_reasons(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<AssetLogReasonFilter>,
    sort: Option<AssetLogReasonSort>,
) -> Result<ListResult<AssetLogReason>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = AssetLogReasonRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_asset_log_reason(
    ctx: &ServiceContext,
    id: String,
) -> Result<AssetLogReason, SingleRecordError> {
    let repository = AssetLogReasonRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(AssetLogReasonFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
