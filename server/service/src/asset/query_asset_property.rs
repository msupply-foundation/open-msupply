use repository::{
    asset_property::{AssetPropertyFilter, AssetPropertyRepository},
    asset_property_row::AssetPropertyRow,
    EqualFilter, StorageConnection,
};

use crate::{
    service_provider::ServiceContext, usize_to_u32, ListError, ListResult, SingleRecordError,
};

pub fn get_asset_properties(
    connection: &StorageConnection,
    filter: Option<AssetPropertyFilter>,
) -> Result<ListResult<AssetPropertyRow>, ListError> {
    let repository = AssetPropertyRepository::new(connection);

    let rows = repository.query(filter.clone())?;

    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}

pub fn get_asset_property(
    ctx: &ServiceContext,
    id: String,
) -> Result<AssetPropertyRow, SingleRecordError> {
    let repository = AssetPropertyRepository::new(&ctx.connection);

    let mut result = repository.query(Some(
        AssetPropertyFilter::new().id(EqualFilter::equal_to(&id)),
    ))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
