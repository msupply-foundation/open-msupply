use crate::{
    i64_to_u32, service_provider::ServiceContext, ListError, ListResult, SingleRecordError,
};
use repository::{EqualFilter, Warning, WarningFilter, WarningRepository};

pub fn get_warning(ctx: &ServiceContext, id: String) -> Result<Warning, SingleRecordError> {
    let mut result = WarningRepository::new(&ctx.connection)
        .query(Some(WarningFilter::new().id(EqualFilter::equal_to(&id))))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

pub fn get_warnings(
    ctx: &ServiceContext,

    filter: Option<WarningFilter>,
) -> Result<ListResult<Warning>, ListError> {
    let repository = WarningRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(filter.clone())?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
