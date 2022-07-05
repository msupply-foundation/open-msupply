use crate::invoice::{
    check_invoice_is_editable, check_invoice_status, InvoiceIsNotEditable, InvoiceRowStatusError,
};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::EqualFilter;
use repository::{
    InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRowType, InvoiceRow, InvoiceRowRepository,
    InvoiceRowStatus, InvoiceRowType, Name, RepositoryError, StorageConnection,
};

use super::{UpdateOutboundShipment, UpdateOutboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateOutboundShipment,
) -> Result<(InvoiceRow, Option<Name>), UpdateOutboundShipmentError> {
    use UpdateOutboundShipmentError::*;
    let invoice = check_invoice_exists(&patch.id, connection)?;
    // TODO check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice)?;
    check_invoice_is_editable(&invoice)?;
    check_invoice_status(&invoice, patch.full_status(), &patch.on_hold)?;
    check_can_change_status_to_allocated(connection, &invoice, patch.full_status())?;

    let other_party_id = match &patch.other_party_id {
        None => return Ok((invoice, None)),
        Some(other_party_id) => other_party_id,
    };

    let other_party = check_other_party(
        connection,
        store_id,
        &other_party_id,
        CheckOtherPartyType::Customer,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotACustomer,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok((invoice, Some(other_party)))
}

fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateOutboundShipmentError> {
    let result = InvoiceRowRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        return Err(UpdateOutboundShipmentError::InvoiceDoesNotExists);
    }
    Ok(result?)
}

// If status is beinged changed to allocated and above, return error if there are
// unallocated lines with quantity above 0, zero quantity unallocated lines will be deleted
fn check_can_change_status_to_allocated(
    connection: &StorageConnection,
    invoice_row: &InvoiceRow,
    status_option: Option<InvoiceRowStatus>,
) -> Result<(), UpdateOutboundShipmentError> {
    if invoice_row.status != InvoiceRowStatus::New {
        return Ok(());
    };

    if let Some(new_status) = status_option {
        if new_status == InvoiceRowStatus::New {
            return Ok(());
        }

        let repository = InvoiceLineRepository::new(connection);
        let unallocated_lines = repository.query_by_filter(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(&invoice_row.id))
                .r#type(InvoiceLineRowType::UnallocatedStock.equal_to())
                .number_of_packs(EqualFilter::not_equal_to_i32(0)),
        )?;

        if unallocated_lines.len() > 0 {
            return Err(
                UpdateOutboundShipmentError::CanOnlyChangeToAllocatedWhenNoUnallocatedLines(
                    unallocated_lines,
                ),
            );
        }
    }

    Ok(())
}

fn check_invoice_type(invoice: &InvoiceRow) -> Result<(), UpdateOutboundShipmentError> {
    if invoice.r#type != InvoiceRowType::OutboundShipment {
        Err(UpdateOutboundShipmentError::NotAnOutboundShipment)
    } else {
        Ok(())
    }
}

impl From<InvoiceIsNotEditable> for UpdateOutboundShipmentError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        UpdateOutboundShipmentError::InvoiceIsNotEditable
    }
}

impl From<InvoiceRowStatusError> for UpdateOutboundShipmentError {
    fn from(error: InvoiceRowStatusError) -> Self {
        use UpdateOutboundShipmentError::*;
        match error {
            InvoiceRowStatusError::CannotChangeStatusOfInvoiceOnHold => {
                CannotChangeStatusOfInvoiceOnHold
            }
            InvoiceRowStatusError::CannotReverseInvoiceStatus => CannotReverseInvoiceStatus,
        }
    }
}
