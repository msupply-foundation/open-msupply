use super::OutError;
use crate::{
    number::next_number, requisition::requisition_supply_status::RequisitionLineSupplyStatus,
    validate::get_other_party,
};
use chrono::Utc;
use repository::{
    CurrencyFilter, CurrencyRepository, InvoiceLineRow, InvoiceLineRowType, InvoiceRow,
    InvoiceRowStatus, InvoiceRowType, ItemRowRepository, NumberRowType, Requisition,
    StorageConnection,
};
use util::uuid::uuid;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    requisition: Requisition,
    fulfillments: Vec<RequisitionLineSupplyStatus>,
) -> Result<(InvoiceRow, Vec<InvoiceLineRow>), OutError> {
    let other_party = get_other_party(connection, store_id, &requisition.name_row.id)?
        .ok_or(OutError::ProblemGettingOtherParty)?;
    let requisition_row = requisition.requisition_row;
    let currency = CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .pop()
        .ok_or(OutError::DatabaseError(
            repository::RepositoryError::NotFound,
        ))?;

    let new_invoice = InvoiceRow {
        id: uuid(),
        user_id: Some(user_id.to_string()),
        name_link_id: requisition_row.name_link_id,
        name_store_id: other_party.store_id().map(|id| id.to_string()),
        store_id: store_id.to_owned(),
        invoice_number: next_number(connection, &NumberRowType::OutboundShipment, &store_id)?,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::New,
        created_datetime: Utc::now().naive_utc(),
        requisition_id: Some(requisition_row.id),

        // Default
        currency_id: Some(currency.currency_row.id),
        currency_rate: 1.0,
        on_hold: false,
        comment: None,
        their_reference: None,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        colour: None,
        linked_invoice_id: None,
        tax_percentage: None,
        clinician_link_id: None,
        original_shipment_id: None,
    };

    let invoice_line_rows = generate_invoice_lines(connection, &new_invoice.id, fulfillments)?;
    Ok((new_invoice, invoice_line_rows))
}

pub fn generate_invoice_lines(
    connection: &StorageConnection,
    invoice_id: &str,
    requisition_line_supply_statuses: Vec<RequisitionLineSupplyStatus>,
) -> Result<Vec<InvoiceLineRow>, OutError> {
    let mut invoice_line_rows = vec![];

    for requisition_line_supply_status in requisition_line_supply_statuses.into_iter() {
        let item_row = ItemRowRepository::new(connection)
            .find_active_by_id(requisition_line_supply_status.item_id())?
            .ok_or(OutError::ProblemFindingItem)?;

        invoice_line_rows.push(InvoiceLineRow {
            id: uuid(),
            invoice_id: invoice_id.to_owned(),
            pack_size: 1,
            number_of_packs: requisition_line_supply_status.remaining_quantity(),
            item_link_id: item_row.id,
            item_code: item_row.code,
            item_name: item_row.name,
            r#type: InvoiceLineRowType::UnallocatedStock,

            // Default
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            tax_percentage: None,
            note: None,
            location_id: None,
            batch: None,
            expiry_date: None,
            sell_price_per_pack: 0.0,
            cost_price_per_pack: 0.0,
            stock_line_id: None,
            inventory_adjustment_reason_id: None,
            return_reason_id: None,
            foreign_currency_price_before_tax: None,
        });
    }

    Ok(invoice_line_rows)
}
