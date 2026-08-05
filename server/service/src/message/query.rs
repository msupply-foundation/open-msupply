use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};
use repository::{
    message::{Message, MessageFilter, MessageRepository, MessageSort},
    EqualFilter, PaginationOption,
};

pub fn get_messages(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<MessageFilter>,
    sort: Option<MessageSort>,
) -> Result<ListResult<Message>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = MessageRepository::new(&ctx.connection);

    // Store scope is a hard boundary: only messages the acting store sent or
    // received (spec messaging/rules.md › store scope).
    let filter = filter
        .unwrap_or_default()
        .visible_to_store_id(ctx.store_id.clone());

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_message(ctx: &ServiceContext, id: String) -> Result<Message, SingleRecordError> {
    let repository = MessageRepository::new(&ctx.connection);

    let mut result = repository.query_by_filter(
        MessageFilter::new()
            .id(EqualFilter::equal_to(id.to_string()))
            .visible_to_store_id(ctx.store_id.clone()),
    )?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

/// Count of messages unread for the acting store, over an optional caller filter
/// (e.g. kind = GLOBAL, or a record id). The store-scope + unread-only clauses
/// are applied here.
pub fn get_unread_message_count(
    ctx: &ServiceContext,
    filter: Option<MessageFilter>,
) -> Result<i64, ListError> {
    let repository = MessageRepository::new(&ctx.connection);

    let filter = filter
        .unwrap_or_default()
        .visible_to_store_id(ctx.store_id.clone())
        .unread_only(true);

    Ok(repository.count(Some(filter))?)
}
