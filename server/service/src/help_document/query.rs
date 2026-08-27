use repository::{
    EqualFilter, HelpDocument, HelpDocumentFilter, HelpDocumentRepository, HelpDocumentSort,
    PaginationOption, RepositoryError,
};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub fn get_help_documents(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<HelpDocumentFilter>,
    sort: Option<HelpDocumentSort>,
) -> Result<ListResult<HelpDocument>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = HelpDocumentRepository::new(&ctx.connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_help_document(
    ctx: &ServiceContext,
    id: &str,
) -> Result<Option<HelpDocument>, RepositoryError> {
    Ok(HelpDocumentRepository::new(&ctx.connection)
        .query_by_filter(HelpDocumentFilter::new().id(EqualFilter::equal_to(id.to_string())))?
        .pop())
}
