use crate::{
    i64_to_u32, service_provider::ServiceContext, ListError, ListResult, SingleRecordError,
};
use repository::{EqualFilter, ItemWarningLink, ItemWarningLinkFilter, ItemWarningLinkRepository};

pub fn get_item_warning_link(
    ctx: &ServiceContext,
    id: String,
) -> Result<ItemWarningLink, SingleRecordError> {
    let mut result = ItemWarningLinkRepository::new(&ctx.connection).query(Some(
        ItemWarningLinkFilter::new().id(EqualFilter::equal_to(&id)),
    ))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

pub fn get_item_warning_links(
    ctx: &ServiceContext,

    filter: Option<ItemWarningLinkFilter>,
) -> Result<ListResult<ItemWarningLink>, ListError> {
    let repository = ItemWarningLinkRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(filter.clone())?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
