use repository::EqualFilter;
use repository::{
    RepositoryError, RequisitionLine, RequisitionLineFilter, RequisitionLineRepository,
    StorageConnection,
};

pub fn check_requisition_line_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<RequisitionLine>, RepositoryError> {
    RequisitionLineRepository::new(connection)
        .query_one(RequisitionLineFilter::new().id(EqualFilter::equal_to_string(id)))
}

pub fn check_item_exists_in_requisition(
    connection: &StorageConnection,
    requisition_id: &str,
    item_id: &str,
) -> Result<Option<RequisitionLine>, RepositoryError> {
    let mut lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new()
            .requisition_id(EqualFilter::equal_to_string(requisition_id))
            .item_id(EqualFilter::equal_to_string(item_id)),
    )?;

    Ok(lines.pop())
}
