use repository::{
    Invoice, InvoiceFilter, InvoiceRepository, RepositoryError, Requisition, RequisitionFilter,
    RequisitionRepository, StorageConnection,
};
use thiserror::Error;

pub(crate) mod invoice;
pub(crate) mod requisition;

#[derive(Error, Debug)]
pub(crate) enum GetRequisitionAndLinkedRequisitionError {
    #[error("Requisition not found {0:?}")]
    RequisitionNotFound(String),
    #[error("Linked requisition not found {0:?}")]
    LinkedRequisitionNotFound(Requisition),
    #[error("Database error {0:?}")]
    DatabaseError(RepositoryError),
}

#[derive(Error, Debug)]
pub(crate) enum GetLinkedOriginalShipmentError {
    #[error("Original shipment not found {0:?}")]
    ShipmentNotFound(String),
    #[error("Linked original shipment not found {0:?}")]
    LinkedShipmentNotFound(Invoice),
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

pub(crate) fn get_linked_original_shipment(
    connection: &StorageConnection,
    original_shipment_id: &str,
) -> Result<Option<Invoice>, GetLinkedOriginalShipmentError> {
    use GetLinkedOriginalShipmentError as Error;
    let repo = InvoiceRepository::new(connection);

    let original_shipment = repo
        .query_one(InvoiceFilter::by_id(original_shipment_id))
        .map_err(Error::DatabaseError)?
        .ok_or_else(|| Error::ShipmentNotFound(original_shipment_id.to_string()))?;

    let linked_original_shipment = match &original_shipment.invoice_row.linked_invoice_id {
        // most of the time, original shipment will have a linked_invoice_id, which we can use to retrieve
        // the linked shipment
        Some(id) => {
            let linked_shipment = repo
                .query_one(InvoiceFilter::by_id(id))
                .map_err(Error::DatabaseError)?
                .ok_or_else(|| Error::LinkedShipmentNotFound(original_shipment.clone()))?;
            Some(linked_shipment)
        }
        // It's possible that shipments have been linked, but the linked_invoice_id hasn't propagated back
        // to our original shipment yet. So we check if there is any shipment that has a linked_invoice_id
        // which matches our original shipment
        None => repo
            .query_one(InvoiceFilter::new_match_linked_invoice_id(
                &original_shipment.invoice_row.id,
            ))
            .map_err(Error::DatabaseError)?,
    };

    Ok(linked_original_shipment)
}
