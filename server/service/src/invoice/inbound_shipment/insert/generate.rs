use chrono::Utc;

use repository::{
    CurrencyFilter, CurrencyRepository, EqualFilter, InvoiceRow, InvoiceStatus, InvoiceType, Name,
    NumberRowType, PurchaseOrderRowRepository, RepositoryError, StorageConnection,
};

use crate::number::next_number;

use super::InsertInboundShipment;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertInboundShipment {
        id,
        other_party_id,
        on_hold,
        comment,
        their_reference,
        colour,
        requisition_id,
        purchase_order_id,
        insert_lines_from_purchase_order: _,
    }: InsertInboundShipment,
    other_party: Name,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();

    // If linked to a PO, use the PO's currency; otherwise fall back to home currency
    let (currency_id, currency_rate) =
        if let Some(ref po_id) = purchase_order_id {
            let po = PurchaseOrderRowRepository::new(connection)
                .find_one_by_id(po_id)?
                .ok_or(RepositoryError::NotFound)?;

            if let Some(po_currency_id) = &po.currency_id {
                // Look up the latest rate from the currency table for the PO's currency
                let po_currency = CurrencyRepository::new(connection)
                    .query_by_filter(
                        CurrencyFilter::new().id(EqualFilter::equal_to(po_currency_id.clone())),
                    )?
                    .pop()
                    .ok_or(RepositoryError::NotFound)?;

                (
                    po_currency.currency_row.id,
                    po_currency.currency_row.rate,
                )
            } else {
                // PO has no currency set, fall back to home currency
                let home = CurrencyRepository::new(connection)
                    .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
                    .pop()
                    .ok_or(RepositoryError::NotFound)?;
                (home.currency_row.id, 1.0)
            }
        } else {
            let home = CurrencyRepository::new(connection)
                .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
                .pop()
                .ok_or(RepositoryError::NotFound)?;
            (home.currency_row.id, 1.0)
        };

    let result = InvoiceRow {
        id,
        user_id: Some(user_id.to_string()),
        name_id: other_party_id,
        name_store_id: other_party.store_id().map(|id| id.to_string()),
        r#type: InvoiceType::InboundShipment,
        comment,
        their_reference,
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, store_id)?,
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceStatus::New,
        on_hold: on_hold.unwrap_or(false),
        colour,
        requisition_id,
        purchase_order_id,
        currency_id: Some(currency_id),
        currency_rate,
        tax_percentage: None,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        received_datetime: None,
        verified_datetime: None,
        cancelled_datetime: None,
        linked_invoice_id: None,
        clinician_link_id: None,
        original_shipment_id: None,
        backdated_datetime: None,
        diagnosis_id: None,
        program_id: None,
        name_insurance_join_id: None,
        insurance_discount_amount: None,
        insurance_discount_percentage: None,
        is_cancellation: false,
        expected_delivery_date: None,
        default_donor_id: None,
        shipping_method_id: None,
        charges_local_currency: 0.0,
        charges_foreign_currency: 0.0,
        ..Default::default()
    };

    Ok(result)
}
