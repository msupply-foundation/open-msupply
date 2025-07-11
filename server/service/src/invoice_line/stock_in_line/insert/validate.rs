use crate::{
    check_item_variant_exists, check_location_exists, check_vvm_status_exists,
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        stock_in_line::check_pack_size,
        validate::{check_item_exists, check_line_exists, check_number_of_packs},
    },
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
    NullableUpdate,
};
use repository::{InvoiceRow, ItemRow, StorageConnection};

use super::{InsertStockInLine, InsertStockInLineError};

pub fn validate(
    input: &InsertStockInLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), InsertStockInLineError> {
    use InsertStockInLineError::*;
    if (check_line_exists(connection, &input.id)?).is_some() {
        return Err(LineAlreadyExists);
    }
    if !check_pack_size(Some(input.pack_size)) {
        return Err(PackSizeBelowOne);
    }
    if !check_number_of_packs(Some(input.number_of_packs)) {
        return Err(NumberOfPacksBelowZero);
    }

    let item = check_item_exists(connection, &input.item_id)?.ok_or(ItemNotFound)?;

    if let Some(NullableUpdate {
        value: Some(ref location),
    }) = &input.location
    {
        if !check_location_exists(connection, store_id, location)? {
            return Err(LocationDoesNotExist);
        }
    }

    if let Some(item_variant_id) = &input.item_variant_id {
        if check_item_variant_exists(connection, item_variant_id)?.is_none() {
            return Err(ItemVariantDoesNotExist);
        }
    }

    if let Some(vvm_status_id) = &input.vvm_status_id {
        if check_vvm_status_exists(connection, vvm_status_id)?.is_none() {
            return Err(VVMStatusDoesNotExist);
        }
    }

    let invoice =
        check_invoice_exists(&input.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    };
    if !check_invoice_type(&invoice, input.r#type.to_domain()) {
        return Err(NotAStockIn);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }

    if let Some(donor_id) = &input.donor_id {
        match check_other_party(connection, store_id, donor_id, CheckOtherPartyType::Donor) {
            Ok(_) => {}
            Err(e) => match e {
                OtherPartyErrors::OtherPartyDoesNotExist => return Err(DonorDoesNotExist),
                OtherPartyErrors::OtherPartyNotVisible => {} // Invisible donors are allowed as it's possible to have a stock in from a donor that is not visible
                OtherPartyErrors::TypeMismatched => return Err(SelectedDonorPartyIsNotADonor),
                OtherPartyErrors::DatabaseError(repository_error) => {
                    return Err(DatabaseError(repository_error))
                }
            },
        };
    };

    // TODO: LocationDoesNotBelongToCurrentStore

    Ok((item, invoice))
}
