use repository::{
    RepositoryError, Requisition, RequisitionFilter, RequisitionRepository, StorageConnection,
};
use thiserror::Error;

pub(crate) mod requisition;
pub(crate) mod shipment;

#[derive(Error, Debug)]
pub(crate) enum GetRequisitionAndLinkedRequisitionError {
    #[error("Requisition not found {0:?}")]
    RequisitionNotFound(String),
    #[error("Linked requisition not found {0:?}")]
    LinkedRequisitionNotFound(Requisition),
    #[error("Database error {0:?}")]
    DatabaseError(RepositoryError),
}

pub(crate) fn get_requisition_and_linked_requisition(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<(Requisition, Option<Requisition>), GetRequisitionAndLinkedRequisitionError> {
    use GetRequisitionAndLinkedRequisitionError as Error;
    let repo = RequisitionRepository::new(connection);

    let requisition = repo
        .query_one(RequisitionFilter::by_id(requisition_id))
        .map_err(Error::DatabaseError)?
        .ok_or_else(|| Error::RequisitionNotFound(requisition_id.to_string()))?;

    let linked_requisition = match &requisition.requisition_row.linked_requisition_id {
        Some(id) => {
            let linked_requisition = repo
                .query_one(RequisitionFilter::by_id(id))
                .map_err(Error::DatabaseError)?
                .ok_or_else(|| Error::LinkedRequisitionNotFound(requisition.clone()))?;
            Some(linked_requisition)
        }
        None => repo
            .query_one(RequisitionFilter::by_linked_requisition_id(
                &requisition.requisition_row.id,
            ))
            .map_err(Error::DatabaseError)?,
    };

    Ok((requisition, linked_requisition))
}
