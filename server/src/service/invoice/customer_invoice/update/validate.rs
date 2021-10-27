use crate::{
    database::{
        repository::{InvoiceRepository, NameQueryRepository, RepositoryError, StorageConnection},
        schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
    },
    domain::{
        invoice::InvoiceStatus, name::NameFilter, outbound_shipment::UpdateOutboundShipment,
        Pagination,
    },
};

use super::UpdateOutboundShipmentError;

pub fn validate(
    patch: &UpdateOutboundShipment,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateOutboundShipmentError> {
    let invoice = check_invoice_exists(&patch.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice)?;
    check_invoice_finalised(&invoice)?;
    check_invoice_status(patch, &invoice)?;
    check_other_party(&patch.other_party_id, connection)?;

    Ok(invoice)
}

fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateOutboundShipmentError> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        return Err(UpdateOutboundShipmentError::InvoiceDoesNotExists);
    }
    Ok(result?)
}

fn check_invoice_status(
    patch: &UpdateOutboundShipment,
    invoice: &InvoiceRow,
) -> Result<(), UpdateOutboundShipmentError> {
    match (&invoice.status, &patch.status) {
        (InvoiceRowStatus::Confirmed, Some(InvoiceStatus::Draft)) => {
            Err(UpdateOutboundShipmentError::CannotChangeInvoiceBackToDraft)
        }
        _ => Ok(()),
    }
}

fn check_invoice_type(invoice: &InvoiceRow) -> Result<(), UpdateOutboundShipmentError> {
    if invoice.r#type != InvoiceRowType::OutboundShipment {
        Err(UpdateOutboundShipmentError::NotAnOutboundShipment)
    } else {
        Ok(())
    }
}

fn check_invoice_finalised(invoice: &InvoiceRow) -> Result<(), UpdateOutboundShipmentError> {
    if invoice.status == InvoiceRowStatus::Finalised {
        Err(UpdateOutboundShipmentError::InvoiceIsFinalised)
    } else {
        Ok(())
    }
}

pub fn check_other_party(
    id_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<(), UpdateOutboundShipmentError> {
    use UpdateOutboundShipmentError::*;

    if let Some(id) = id_option {
        let repository = NameQueryRepository::new(&connection);

        let mut result = repository.query(
            Pagination::one(),
            Some(NameFilter::new().match_id(&id)),
            None,
        )?;

        if let Some(name) = result.pop() {
            if name.is_customer {
                Ok(())
            } else {
                Err(OtherPartyNotACustomer(name))
            }
        } else {
            Err(OtherPartyDoesNotExists)
        }
    } else {
        Ok(())
    }
}
