use crate::{
    campaign::check_campaign_exists,
    check_item_variant_exists, check_location_exists, check_location_type_is_valid,
    check_vvm_status_exists,
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        stock_in_line::{check_batch, check_pack_size, check_program_visible_to_store},
        validate::{
            check_item_exists, check_line_belongs_to_invoice, check_line_exists,
            check_number_of_packs,
        },
    },
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
    NullableUpdate,
};
use crate::invoice::inbound_shipment::InboundShipmentType;
use repository::{InvoiceLine, InvoiceRow, ItemRow, StorageConnection};

use super::{UpdateStockInLine, UpdateStockInLineError};

pub fn validate(
    input: &UpdateStockInLine,
    store_id: &str,
    connection: &StorageConnection,
    inbound_shipment_type: Option<InboundShipmentType>,
) -> Result<(InvoiceLine, Option<ItemRow>, InvoiceRow), UpdateStockInLineError> {
    use UpdateStockInLineError::*;

    let line = check_line_exists(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let line_row = &line.invoice_line_row;

    if !check_pack_size(input.pack_size) {
        return Err(PackSizeBelowOne);
    }
    if !check_number_of_packs(input.number_of_packs) {
        return Err(NumberOfPacksBelowZero);
    }

    let item = check_item_option(&input.item_id, connection)?;

    let invoice =
        check_invoice_exists(&line_row.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_invoice_type(&invoice, input.r#type.to_domain()) {
        return Err(NotAStockIn);
    }
    if let Some(inbound_type) = inbound_shipment_type {
        if !inbound_type.matches_input(invoice.purchase_order_id.is_some()) {
            return Err(WrongInboundShipmentType);
        }
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }

    if !check_batch(line_row, connection)? {
        return Err(BatchIsReserved);
    }
    if let Some(NullableUpdate {
        value: Some(ref location),
    }) = &input.location
    {
        if !check_location_exists(connection, store_id, location)? {
            return Err(LocationDoesNotExist);
        }

        if let Some(item_restricted_type) = &line.item_row.restricted_location_type_id {
            if !check_location_type_is_valid(connection, store_id, location, item_restricted_type)?
            {
                return Err(IncorrectLocationType);
            }
        }
    }
    if let Some(NullableUpdate {
        value: Some(item_variant_id),
    }) = &input.item_variant_id
    {
        if check_item_variant_exists(connection, item_variant_id)?.is_none() {
            return Err(ItemVariantDoesNotExist);
        }
    }

    if let Some(vvm_status_id) = &input.vvm_status_id {
        if check_vvm_status_exists(connection, vvm_status_id)?.is_none() {
            return Err(VVMStatusDoesNotExist);
        }
    }

    if !check_line_belongs_to_invoice(line_row, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_line_row.invoice_id));
    }

    if let Some(program_id) = &input.program_id {
        if !check_program_visible_to_store(connection, store_id, &program_id.value)? {
            return Err(ProgramNotVisible);
        }
    }

    if let Some(NullableUpdate {
        value: Some(manufacturer_id),
    }) = &input.manufacturer_id
    {
        match check_other_party(
            connection,
            store_id,
            manufacturer_id,
            CheckOtherPartyType::Manufacturer,
        ) {
            Ok(_) => {}
            Err(e) => match e {
                OtherPartyErrors::OtherPartyDoesNotExist => {
                    return Err(ManufacturerDoesNotExist)
                }
                OtherPartyErrors::OtherPartyNotVisible => return Err(ManufacturerNotVisible),
                OtherPartyErrors::TypeMismatched => {
                    return Err(ManufacturerIsNotAManufacturer)
                }
                OtherPartyErrors::DatabaseError(repository_error) => {
                    return Err(DatabaseError(repository_error))
                }
            },
        };
    };

    if let Some(NullableUpdate {
        value: Some(campaign_id),
    }) = &input.campaign_id
    {
        if !check_campaign_exists(connection, campaign_id)? {
            return Err(CampaignDoesNotExist);
        }
    }

    // Cost price is read-only for internal suppliers and external suppliers linked to a PO.
    // Use epsilon comparison to allow unchanged values that may have drifted
    // through floating point serialization (Rust f64 → JSON → JS Number → JSON → f64).
    if let Some(new_cost_price) = input.cost_price_per_pack {
        if (invoice.name_store_id.is_some() || invoice.purchase_order_id.is_some())
            && !f64_approx_eq(new_cost_price, line_row.cost_price_per_pack)
        {
            return Err(CannotEditCostPrice);
        }
    }

    if input
        .status
        .as_ref()
        .is_some_and(|s| s.value != line_row.status)
    {
        use repository::InvoiceStatus::*;
        // Verified is already excluded by check_invoice_is_editable (invoice is no longer editable once verified).
        // Can't change line status once invoice is received as stock lines may have already been allocated so rejecting a line at that point could cause issues with stock management.
        if invoice.status == Received {
            return Err(CannotChangeLineStatusOfReceivedInvoice);
        }
    }

    Ok((line, item, invoice))
}

/// Compare two f64 values for approximate equality using a relative tolerance.
/// Uses a minimum absolute tolerance of 1e-8 to handle values near zero,
/// scaled by the magnitude of the larger operand for large values.
fn f64_approx_eq(a: f64, b: f64) -> bool {
    let tolerance = f64::EPSILON * a.abs().max(b.abs()) * 10.0;
    (a - b).abs() <= tolerance.max(1e-8)
}

fn check_item_option(
    item_id_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<Option<ItemRow>, UpdateStockInLineError> {
    if let Some(item_id) = item_id_option {
        Ok(Some(
            check_item_exists(connection, item_id)?.ok_or(UpdateStockInLineError::ItemNotFound)?,
        ))
    } else {
        Ok(None)
    }
}

#[cfg(test)]
mod test {
    use super::f64_approx_eq;

    #[test]
    fn test_f64_approx_eq() {
        // Identical values
        assert!(f64_approx_eq(1.0, 1.0));
        assert!(f64_approx_eq(0.0, 0.0));

        // Clearly different values
        assert!(!f64_approx_eq(1.0, 2.0));
        assert!(!f64_approx_eq(100.0, 100.01));

        // Large values: difference within relative tolerance should be equal
        let large = 1_000_000.0;
        let drift = f64::EPSILON * large * 5.0;
        assert!(f64_approx_eq(large, large + drift));

        // Large values: meaningful difference should not be equal
        assert!(!f64_approx_eq(large, large + 0.01));

        // Near zero: uses minimum absolute tolerance of 1e-8
        assert!(f64_approx_eq(0.0, 1e-9));
        assert!(!f64_approx_eq(0.0, 1e-7));
    }
}
