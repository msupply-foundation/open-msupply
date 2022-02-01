use domain::EqualFilter;
use repository::{
    schema::RequisitionLineRow, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionLineRowRepository, StorageConnection,
};

pub fn check_requisition_line_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<RequisitionLineRow>, RepositoryError> {
    RequisitionLineRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_item_exists_in_requisition(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<RequisitionLine>, RepositoryError> {
    let mut lines = RequisitionLineRepository::new(connection)
        .query_by_filter(RequisitionLineFilter::new().item_id(EqualFilter::equal_to(id)))?;

    Ok(lines.pop())
}
