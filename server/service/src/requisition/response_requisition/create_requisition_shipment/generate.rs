use super::OutError;
use crate::{
    number::next_number, requisition::requisition_supply_status::RequisitionLineSupplyStatus,
    validate::get_other_party,
};
use chrono::Utc;
use repository::{
    CurrencyFilter, CurrencyRepository, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus,
    InvoiceType, ItemRowRepository, NumberRowType, Requisition, StorageConnection,
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

    let original_customer = match &requisition.requisition_row.original_customer_id {
        Some(original_customer) => get_other_party(connection, store_id, original_customer)?,
        None => None,
    };

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
        name_link_id: original_customer
            .as_ref()
            .map(|customer| customer.name_link_row.id.clone())
            .unwrap_or_else(|| other_party.name_link_row.id.clone()),
        name_store_id: original_customer
            .as_ref()
            .and_then(|customer| customer.store_id().map(|id| id.to_string()))
            .or_else(|| other_party.store_id().map(|id| id.to_string())),
        store_id: store_id.to_string(),
        invoice_number: next_number(connection, &NumberRowType::OutboundShipment, store_id)?,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::New,
        created_datetime: Utc::now().naive_utc(),
        requisition_id: Some(requisition_row.id),
        their_reference: requisition_row.their_reference,
        program_id: requisition_row.program_id,
        currency_id: Some(currency.currency_row.id),

        // Default
        currency_rate: 1.0,
        on_hold: false,
        comment: None,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        received_datetime: None,
        verified_datetime: None,
        cancelled_datetime: None,
        colour: None,
        linked_invoice_id: None,
        tax_percentage: None,
        clinician_link_id: None,
        original_shipment_id: None,
        backdated_datetime: None,
        diagnosis_id: None,
        name_insurance_join_id: None,
        insurance_discount_amount: None,
        insurance_discount_percentage: None,
        is_cancellation: false,
        expected_delivery_date: None,
        default_donor_link_id: None,
        purchase_order_id: None,
        shipping_method_id: None,
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
            invoice_id: invoice_id.to_string(),
            pack_size: 1.0,
            number_of_packs: requisition_line_supply_status.remaining_quantity(),
            item_link_id: item_row.id,
            item_code: item_row.code,
            item_name: item_row.name,
            r#type: InvoiceLineType::UnallocatedStock,

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
            foreign_currency_price_before_tax: None,
            item_variant_id: None,
            prescribed_quantity: None,
            linked_invoice_id: None,
            donor_link_id: None,
            vvm_status_id: None,
            reason_option_id: None,
            campaign_id: None,
            // Generating placeholder outbound lines - program_id will be populated later based on
            // the program of existing stock lines when this line is allocated, rather than the
            // program of the requisition here
            program_id: None,
            shipped_number_of_packs: None,
            volume_per_pack: 0.0,
            shipped_pack_size: None,
        });
    }

    Ok(invoice_line_rows)
}
