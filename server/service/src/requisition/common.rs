use domain::EqualFilter;
use repository::{
    schema::RequisitionRow, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRowRepository, StorageConnection,
};

pub fn check_requisition_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<RequisitionRow>, RepositoryError> {
    RequisitionRowRepository::new(connection).find_one_by_id(id)
}

pub fn get_lines_for_requisition(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<Vec<RequisitionLine>, RepositoryError> {
    RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(requisition_id)),
    )
}
